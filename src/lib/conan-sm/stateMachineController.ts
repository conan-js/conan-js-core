import {ListenerDefType, ListenerMetadata, StageToProcess, StateMachine} from "./stateMachine";
import {BaseActions, ListenerType, OnEventCallback, SmListener} from "./stateMachineListeners";
import {Stage, StageDef, StageLogicParser} from "./stage";
import {TransactionTree} from "../conan-tx/transactionTree";
import {ICallback, WithMetadataArray} from "../conan-utils/typesHelper";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {TransactionRequest} from "../conan-tx/transaction";
import {Strings} from "../conan-utils/strings";
import {EventType} from "./stateMachineLogger";
import {Proxyfier} from "../conan-utils/proxyfier";

export class StateMachineController<SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS = any,
    > {
    private readonly transactionTree: TransactionTree = new TransactionTree();

    constructor(
        private stateMachine: StateMachine<SM_ON_LISTENER, SM_IF_LISTENER, ACTIONS>,
        private readonly onSleep: ICallback,
        private readonly onResume: ICallback
    ) {
    }

    requestStage(stage: Stage): void {
        let stageName = stage.stateName;
        if (this.stateMachine.getStageDef(stage.stateName) == null) {
            throw new Error(`can't move sm: [${this.stateMachine.stateMachineDef.name}] to ::${stageName} and is not a valid stage, ie one of: (${Object.keys(this.stateMachine.stateMachineDef.stageDefsByKey).join(', ')})`)
        }

        this.transactionTree.createOrQueueTransaction(
            this.createStageTxRequest(stage),
            () => this.onSleep(),
            () => this.onResume()
        );
    }

    requestTransition(transition: SmTransition): this {
        let actions = this.createTransitionActions(transition);
        let eventName = Strings.camelCaseWithPrefix('on', transition.transitionName);
        this.transactionTree.createOrQueueTransaction(
            this.createActionTxRequest(transition),
            () => this.onSleep(),
            () => this.onResume()
        );

        return this;

    }

    private createTransitionActions(transition: SmTransition): any {
        return {};
    }

    private createStageActions(stage: Stage): any {
        let baseActions: BaseActions = {
            requestTransition: (transition: SmTransition): void => {
                this.requestTransition(transition);
            },
            getStateData: (): any => {
                this.stateMachine.getStateData();
            },
            requestStage: (stageToProcess: StageToProcess): void => {
                this.requestStage(stage);
            },
            stop: (): void => {
                throw new Error('TBI')
            }
        };
        let stageDef: StageDef<string, any, any, any> = this.stateMachine.getStageDef(stage.stateName);
        if (!stageDef || !stageDef.logic) return baseActions;

        let actionsLogic: any = StageLogicParser.parse(stageDef.logic)(stage.data);
        let proxied = Proxyfier.proxy(actionsLogic, (originalCall, metadata) => {
            let nextStage: Stage = originalCall();
            let nextStageDef: StageDef<string, any, any, any> = this.stateMachine.getStageDef(nextStage.stateName);
            if (nextStageDef == null) {
                throw new Error(`trying to move to a non existent stage: ${nextStage.stateName}`);
            }

            this.stateMachine.log(EventType.PROXY, `(${metadata.methodName})=>::${nextStage.stateName}`);
            this.requestTransition({
                transitionName: metadata.methodName,
                ...metadata.payload ? {payload: metadata.payload} : undefined,
                transition: nextStage,
            });
            return nextStage;
        });
        return Object.assign(proxied, baseActions);


    }

    createActionTxRequest(
        transition: SmTransition,
    ): TransactionRequest {
        let eventName = Strings.camelCaseWithPrefix('on', transition.transitionName);
        return {
            name: `=>${transition.transitionName}`,
            onStart: {
                metadata: `+tx[=>${transition.transitionName}]>`,
                value: () => {
                    this.stateMachine.log(EventType.TR_OPEN);
                    this.stateMachine.moveToTransition(transition);
                },
            },
            reactionsProducer: () => this.reactionsAsCallbacks(this.stateMachine.createReactions(eventName, ListenerDefType.INTERCEPTOR), this.createTransitionActions(transition)),
            doChain: {
                metadata: `[request-stage]::${transition.transition.stateName}`,
                value: () => {
                    this.stateMachine.log(EventType.TR_CHAIN, `//::${transition.transition.stateName}`);
                    return this.createStageTxRequest(transition.transition);
                }
            },
            onReactionsProcessed: (reactionsProcessed) => this.deleteOnceListenersUsed(reactionsProcessed, ListenerDefType.INTERCEPTOR)
        }
    }


    private createStageTxRequest(
        stage: Stage,
    ): TransactionRequest {
        let eventName = Strings.camelCaseWithPrefix('on', stage.stateName);
        return {
            name: `::${stage.stateName}`,
            onStart: {
                metadata: `+tx[::${stage.stateName}]>`,
                value: () => {
                    this.stateMachine.log(EventType.TR_OPEN);
                    this.stateMachine.moveToStage(stage);
                }
            },
            reactionsProducer: () => this.reactionsAsCallbacks(this.stateMachine.createReactions(eventName, ListenerDefType.LISTENER), this.createStageActions(stage)),
            onReactionsProcessed: (reactionsProcessed) => this.deleteOnceListenersUsed(reactionsProcessed, ListenerDefType.LISTENER),
            onDone: {
                metadata: `-tx[::${stage.stateName}]>`,
                value: () => {
                    this.stateMachine.log(EventType.TR_CLOSE);
                }
            }
        };
    }

    private reactionsAsCallbacks(reactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, actions: any) {
        return reactions.map(it => ({
            metadata: it.metadata,
            value: () => it.value(actions)
        }));
    }

    private deleteOnceListenersUsed(reactionsProcessed: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, type: ListenerDefType) {
        this.stateMachine.deleteListeners(
            reactionsProcessed
                .filter(it => it.metadata.executionType === ListenerType.ONCE)
                .map(it => it.metadata.name)
            , type);
    }

    getStateData(): any {
        return this.stateMachine.getStateData();
    }

    getEvents(): SerializedSmEvent[] {
        return this.stateMachine.getEvents();
    }
}
