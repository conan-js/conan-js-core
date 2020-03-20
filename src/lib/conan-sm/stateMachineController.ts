import {ListenerDefType, ListenerMetadata, StageToProcess, StateMachine} from "./stateMachine";
import {BaseActions, ListenerType, OnEventCallback, SmListener, SmListenerDefLike} from "./stateMachineListeners";
import {State, StateDef, StateLogicParser} from "./state";
import {TransactionTree} from "../conan-tx/transactionTree";
import {WithMetadataArray} from "../conan-utils/typesHelper";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {TransactionRequest} from "../conan-tx/transaction";
import {Strings} from "../conan-utils/strings";
import {EventType} from "./stateMachineLogger";
import {Proxyfier} from "../conan-utils/proxyfier";
import {StateMachineOrchestrator} from "./stateMachineOrchestrator";

export class StateMachineController<SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS = any,
    > {
    private readonly transactionTree: TransactionTree = new TransactionTree();
    private readonly orchestrator: StateMachineOrchestrator = new StateMachineOrchestrator(
        this,
        undefined,
        undefined
    );

    constructor(
        private stateMachine: StateMachine<SM_ON_LISTENER, SM_IF_LISTENER, ACTIONS>,
    ) {
    }

    requestStage(stage: State): void {
        let stageName = stage.name;
        if (this.stateMachine.getStageDef(stage.name) == null) {
            throw new Error(`can't move sm: [${this.stateMachine.stateMachineDef.name}] to ::${stageName} and is not a valid stage, ie one of: (${Object.keys(this.stateMachine.stateMachineDef.stageDefsByKey).join(', ')})`)
        }

        this.transactionTree.createOrQueueTransaction(
            this.createStageTxRequest(stage),
            () => this.orchestrator.onSleep(),
            () => this.orchestrator.onResume()
        );
    }

    requestTransition(transition: SmTransition): this {
        let actions = this.createTransitionActions(transition);
        let eventName = Strings.camelCaseWithPrefix('on', transition.transitionName);
        this.transactionTree.createOrQueueTransaction(
            this.createActionTxRequest(transition),
            () => this.orchestrator.onSleep(),
            () => this.orchestrator.onResume()
        );

        return this;

    }

    private createTransitionActions(transition: SmTransition): any {
        return {};
    }

    private createStateActions(state: State): any {
        let baseActions: BaseActions = {
            requestTransition: (transition: SmTransition): void => {
                this.requestTransition(transition);
            },
            getStateData: (): any => {
                this.stateMachine.getStateData();
            },
            requestStage: (stageToProcess: StageToProcess): void => {
                this.requestStage(state);
            },
            stop: (): void => {
                throw new Error('TBI')
            }
        };
        let stageDef: StateDef<string, any, any, any> = this.stateMachine.getStageDef(state.name);
        if (!stageDef || !stageDef.logic) return baseActions;

        let actionsLogic: any = StateLogicParser.parse(stageDef.logic)(state.data);
        let proxied = Proxyfier.proxy(actionsLogic, (originalCall, metadata) => {
            let nextState: State = originalCall();
            this.orchestrator.onActionTriggered (metadata.methodName, nextState);

            return nextState;
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
                metadata: `[request-stage]::${transition.into.name}`,
                value: () => {
                    this.stateMachine.log(EventType.TR_CHAIN, `//::${transition.into.name}`);
                    return this.createStageTxRequest({
                        data: transition.payload,
                        name: transition.into.name
                    });
                }
            },
            onReactionsProcessed: (reactionsProcessed) => this.deleteOnceListenersUsed(reactionsProcessed, ListenerDefType.INTERCEPTOR)
        }
    }


    private createStageTxRequest(
        state: State,
    ): TransactionRequest {
        let eventName = Strings.camelCaseWithPrefix('on', state.name);
        return {
            name: `::${state.name}`,
            onStart: {
                metadata: `+tx[::${state.name}]>`,
                value: () => {
                    this.stateMachine.log(EventType.TR_OPEN);
                    this.stateMachine.moveToStage(state);
                }
            },
            reactionsProducer: () => this.reactionsAsCallbacks(this.stateMachine.createReactions(eventName, ListenerDefType.LISTENER), this.createStateActions(state)),
            onReactionsProcessed: (reactionsProcessed) => this.deleteOnceListenersUsed(reactionsProcessed, ListenerDefType.LISTENER),
            onDone: {
                metadata: `-tx[::${state.name}]>`,
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

    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>) {
        let currentStageName = this.stateMachine.getCurrentStageName();
        this.stateMachine.createReactions(
            currentStageName,
            ListenerDefType.LISTENER
        )
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

    log (eventType: EventType, details?: string, additionalLines?: [string, string][]): void {
        this.stateMachine.log(eventType, details, additionalLines)
    }

    getStateDef(name: string): StateDef<any, any, any> {
        return this.stateMachine.getStageDef(name);
    }

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.stateMachine.addListener(listener, type);
        return this;
    }
}
