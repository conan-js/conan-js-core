import {BaseActions, ListenerType, OnEventCallback, SmListener} from "./stateMachineListeners";
import {
    ListenerDefType,
    ListenerMetadata,
    StageToProcess,
    StateMachine,
    StateMachineStatus,
    ToProcessType
} from "./stateMachine";
import {Stage, StageDef, StageLogicParser} from "./stage";
import {IConsumer, WithMetadataArray} from "../conan-utils/typesHelper";
import {Strings} from "../conan-utils/strings";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {SmTransactionsRequests} from "./smTransactionsRequests";
import {TransactionTree} from "../conan-tx/transactionTree";
import {Proxyfier} from "../conan-utils/proxyfier";
import {EventType, StateMachineLogger, StateMachineLoggerHelper} from "./stateMachineLogger";
import {StateMachineTreeFactory} from "./stateMachineTreeFactory";

export interface ParentRelationship {
    parent: StateMachineTree<any>;
    joinsIntoStages: string[];
}

export interface StateMachineEndpoint {
    requestStage(stageToProcess: StageToProcess): void;

    requestTransition(transition: SmTransition): void;
}

export class StateMachineTree<
    SM_ON_LISTENER extends SmListener,
> implements StateMachineLogger, StateMachineEndpoint {
    readonly smTransactions: SmTransactionsRequests = new SmTransactionsRequests();
    readonly transactionTree: TransactionTree = new TransactionTree();

    constructor(
        readonly root: StateMachine<any, any>,
        readonly parentInfo?: ParentRelationship,
    ) {}

    public getStageDef (name: string): StageDef<any, any, any>{
        return this.root.stateMachineDef.stageDefsByKey [name]
    }

    public isJoiningBackOn (stageName: string): boolean {
        return this.parentInfo && this.parentInfo.joinsIntoStages.indexOf(stageName) !== -1;
    }
    public fork<ACTIONS = any>(
        nextStage: Stage,
        defer: IConsumer<ACTIONS>,
        joinsInto: string []
    ): StateMachineTree<any> {
        this.root._status = StateMachineStatus.PAUSED;
        let forkSmName = `${this.root.stateMachineDef.name}/${nextStage.stateName}`;
        this.log(EventType.FORK,  `[FORK]::${forkSmName}`);

        let stateMachineTree = this.doFork(
            forkSmName,
            {
                parent: this,
                joinsIntoStages: joinsInto
            },
            nextStage,
            this.root.stateMachineDef.stageDefsByKey[nextStage.stateName],
            defer
        );
        this.root.forkInto (stateMachineTree);
        return stateMachineTree;
    }

    public doFork(
        forkName: string,
        parent: ParentRelationship,
        forkIntoStage: Stage,
        forkIntoStageDef: StageDef<any, any, any>,
        defer: IConsumer<any>
    ):StateMachineTree<any> {
        let deferEventName = Strings.camelCaseWithPrefix('on', forkIntoStage.stateName);
        let deferPathName = Strings.camelCaseWithPrefix('do', forkIntoStage.stateName);

        return StateMachineTreeFactory.create({
            syncDefs: undefined,
            rootDef: {
                name: forkName,
                stageDefsByKey: {
                    [forkIntoStage.stateName]: {
                        name: forkIntoStage.stateName,
                        logic: forkIntoStageDef.logic
                    }
                },
                listeners: [
                    {
                        metadata: {
                            name: `::start=>${deferPathName}`,
                            executionType: ListenerType.ONCE,
                        },
                        value: {
                            onStart: (actions: any) => actions.requestTransition({
                                transitionName: deferPathName,
                                transition: forkIntoStage,
                                payload: forkIntoStage.data
                            })
                        }
                    },
                    {
                        metadata: {
                            name: `::${deferEventName}->[DEFERRED]`,
                            executionType: ListenerType.ALWAYS
                        },
                        value: {
                            [deferEventName]: (actions: any) => defer(actions)
                        }
                    }],
                interceptors: [],
            }
        }, parent);
    }

    createActions(stageName: string, stagePayload: any,): any {
        let baseActions: BaseActions = {
            requestTransition: (transition: SmTransition): void => {
                this.requestTransition(transition);
            },
            getStateData: (): any =>{
                this.getStateData();
            },
            requestStage: (stageToProcess: StageToProcess): void => {
                this.requestStage(stageToProcess);
            },
            stop: (): void => {
                throw new Error('TBI')
            }
        };
        let stageDef: StageDef<string, any, any, any> = this.getStageDef(stageName);
        if (!stageDef || !stageDef.logic) return baseActions;

        let actionsLogic: any = StageLogicParser.parse(stageDef.logic)(stagePayload);
        let proxied = Proxyfier.proxy(actionsLogic, (originalCall, metadata)=>{
            let nextStage: Stage = originalCall ();
            let nextStageDef: StageDef<string, any, any, any> = this.getStageDef(stageName);
            if (nextStageDef == null) {
                if (!this.parentInfo.parent) {
                    throw new Error(`trying to move to a non existent stage: ${nextStage.stateName}`);
                }

                nextStageDef = this.parentInfo.parent.getStageDef(nextStage.stateName);
                if (!nextStageDef) {
                    throw new Error(`trying to move to a non existent stage from a forked stateMachine: ${nextStage.stateName}`);
                }
            }

            this.log(EventType.PROXY,  `(${metadata.methodName})=>::${nextStage.stateName}`);
            this.requestTransition({
                transitionName: metadata.methodName,
                ...metadata.payload ? {payload: metadata.payload} : undefined,
                transition: nextStage,
            });
            return nextStage;
        });
        return Object.assign(proxied, baseActions);

    }

    createListenerReactions(eventName: string): WithMetadataArray<OnEventCallback<any>, ListenerMetadata> {
        return this.root.createReactions(eventName, ListenerDefType.LISTENER);
    }

    moveToStage(stage: Stage): void {
        this.root.moveToStage (stage);
    }

    getStateData(): any {
        return this.root.getStateData();
    }

    log(eventType: EventType, details?: string, additionalLines?: [string, string][]): void {
        StateMachineLoggerHelper.log(
            this.root.stateMachineDef.name,
            this.root._status,
            this.root.getCurrentStageName(),
            this.root.getCurrentTransitionName(),
            eventType,
            this.transactionTree.getCurrentTransactionId(),
            details,
            additionalLines
        )
    }

    requestStage(stageToProcess: StageToProcess): void {
        this.root.assertNotClosed();

        let stageName = stageToProcess.stage.stateName;
        if (this.getStageDef(stageToProcess.stage.stateName) == null) {
            throw new Error(`can't move sm: [${this.root.stateMachineDef.name}] to ::${stageName} and is not a valid stage, ie one of: (${Object.keys(this.root.stateMachineDef.stageDefsByKey).join(', ')})`)
        }

        this.transactionTree.createOrQueueTransaction(
            this.smTransactions.createStageTransactionRequest(this, stageToProcess),
            () => this.root.sleep(),
            () => this.root.flagAsRunning(stageName)
        );
    }

    deleteListeners(listenerIds: string[]) {
        this.root.deleteListeners(listenerIds, ListenerDefType.LISTENER);
    }

    joinBack(stageToProcess: StageToProcess) {
        let stageName = stageToProcess.stage.stateName;
        let stageDescriptor = `::${stageName}`;
        this.log(EventType.FORK_JOIN,  `<-::${stageName}`);
        this.requestStage({
            type: ToProcessType.STAGE,
            eventType: EventType.FORK_JOIN,
            description: stageDescriptor,
            stage: stageToProcess.stage
        });

    }

    requestTransition(transition: SmTransition): this {
        this.root.assertNotClosed();

        let actions = this.createActions(transition.transition.stateName, transition.payload);
        let eventName = Strings.camelCaseWithPrefix('on', transition.transitionName);
        this.transactionTree
            .createOrQueueTransaction(
                this.smTransactions.createActionTransactionRequest(this, transition, actions, this.root.createReactions(eventName, ListenerDefType.LISTENER),
                    () => {
                        this.root.moveToTransition(
                            transition
                        );
                        this.log(EventType.ACTION, `=>${transition.transitionName}`, [
                            [`payload`, transition.payload == null ? undefined : JSON.stringify(transition.payload)]
                        ]);
                    }
                ),
                () => this.root.sleep(),
                () => this.root.flagAsRunning(transition.transitionName)
            );
        return this;
    }

    getEvents(): SerializedSmEvent [] {
        return this.root.getEvents();
    }


}
