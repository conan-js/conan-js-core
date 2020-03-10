import {EventThread} from "./eventThread";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {Stage, StageDef, StageLogicParser} from "./stage";
import {IConsumer, IKeyValuePairs, WithMetadataArray} from "../conan-utils/typesHelper";
import {Strings} from "../conan-utils/strings";
import {StateMachineFactory} from "./stateMachineFactory";
import {
    ListenerType,
    OnEventCallback,
    SmListener,
    SmListenerDefLike,
    SmListenerDefLikeParser,
    SmListenerDefList
} from "./stateMachineListeners";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {SmController, StateMachineData} from "./_domain";
import {TransactionTree} from "../conan-tx/transactionTree";
import {SmTransactionsRequests} from "./smTransactionsRequests";

export enum ToProcessType {
    STAGE = 'STAGE'
}

export interface StageToProcess extends BaseToProcess {
    type: ToProcessType.STAGE;
    stage: Stage;
}

interface BaseToProcess {
    eventType: EventType;
    type: ToProcessType;
    description: string;
}

export interface ParentStateMachineInfo<SM_LISTENER extends SmListener,
    JOIN_LISTENER extends SmListener,
    > {
    stateMachine: StateMachineImpl<SM_LISTENER, JOIN_LISTENER, any>,
    joinsInto: string[]
}

export enum StateMachineStatus {
    PAUSED = 'PAUSED',
    STOPPED = 'STOPPED',
    IDLE = 'IDLE',
    RUNNING = 'RUNNING',
}

export interface ListenerMetadata {
    name: string,
    executionType: ListenerType,
}

export class StateMachineImpl<SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS,
    > implements SmController<SM_ON_LISTENER, SM_IF_LISTENER> {
    readonly smTransactions: SmTransactionsRequests = new SmTransactionsRequests();
    readonly eventThread: EventThread = new EventThread();
    _status: StateMachineStatus = StateMachineStatus.IDLE;
    readonly transactionTree: TransactionTree = new TransactionTree();
    private closed: boolean = false;
    private readonly smListenerDefLikeParser: SmListenerDefLikeParser = new SmListenerDefLikeParser();

    constructor(
        readonly data: StateMachineData<SM_ON_LISTENER, SM_IF_LISTENER>,
    ) {
    }

    getState(): any {
        return (this.eventThread.currentEvent.data as any).data;
    }


    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.assertNotClosed();
        let listenerDef = this.smListenerDefLikeParser.parse(listener, type);
        StateMachineLogger.log(this.data.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.ADD_LISTENER, this.transactionTree.getCurrentTransactionId(), `(${listenerDef.metadata})[${type}]`);
        this.data.listeners.push(listenerDef);
        return this;
    }

    addInterceptor(interceptor: SmListenerDefLike<SM_IF_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        let listenerDef = this.smListenerDefLikeParser.parse(interceptor, type);
        StateMachineLogger.log(this.data.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.ADD_INTERCEPTOR, this.transactionTree.getCurrentTransactionId(), `(${listenerDef.metadata})`);
        this.data.interceptors.push(
            this.smListenerDefLikeParser.parse(interceptor, type)
        );
        return this;
    }

    stop(): this {
        this.assertNotClosed();
        this.requestTransition({
            transition: {
                state: 'stop',
                data: ((this.eventThread.currentEvent.data) as any ).data
            },
            actionName: 'doStop',
        });
        return this;
    }

    requestStage(stageToProcess: StageToProcess): void {
        this.assertNotClosed();

        let stageName = stageToProcess.stage.state;
        if (this.data.stageDefsByKey [stageName] == null) {
            throw new Error(`can't move sm: [${this.data.name}] to ::${stageName} and is not a valid stage, ie one of: (${Object.keys(this.data.stageDefsByKey).join(', ')})`)
        }

        this.transactionTree.createOrQueueTransaction(
            this.smTransactions.createStageTransactionRequest(this, stageToProcess),
            ()=> this.sleep(),
            () => this.flagAsRunning(stageName)
        );
    }

    requestTransition(transition: SmTransition): this {
        this.assertNotClosed();

        let actions = this.createActions(this, this.data.stageDefsByKey, transition.transition.state, transition.payload);
        let eventName = Strings.camelCaseWithPrefix('on', transition.actionName);
        this.transactionTree
            .createOrQueueTransaction(
                this.smTransactions.createActionTransactionRequest(this, transition, actions, this.createReactions(eventName, this.data.listeners),
                    () => {
                        this.eventThread.addActionEvent(
                            transition
                        );
                        StateMachineLogger.log(this.data.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.ACTION, this.transactionTree.getCurrentTransactionId(), `=>${transition.actionName}`, [
                            [`payload`, transition.payload == null ? undefined : JSON.stringify(transition.payload)]
                        ]);
                    }
                ),
                ()=> this.sleep(),
                () => this.flagAsRunning(transition.actionName)
            );
        return this;
    }

    createReactions(eventName: string, smListeners: SmListenerDefList<any>): WithMetadataArray<OnEventCallback<ACTIONS>, ListenerMetadata> {
        if (smListeners == null || smListeners.length === 0) return [];

        let reactions: WithMetadataArray<OnEventCallback<ACTIONS>, ListenerMetadata> = [];
        smListeners.forEach(smListener => {
            let actionListener: OnEventCallback<ACTIONS> = smListener.value[eventName];
            if (!actionListener) return undefined;

            reactions.push({
                value: (actions, params) => {
                    StateMachineLogger.log(this.data.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.REACTION, this.transactionTree.getCurrentTransactionId(), `(${smListener.metadata})`);
                    actionListener(actions, params)
                },
                metadata: smListener.metadata
            });
        });

        return reactions;

    }

    getStageDef(name: string): StageDef<any, any, any> {
        return this.data.stageDefsByKey [name];
    }

    getEvents(): SerializedSmEvent [] {
        return this.eventThread.serialize();
    }

    shutdown() {
        this.closed = true;
        this._status = StateMachineStatus.STOPPED;
        StateMachineLogger.log(this.data.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.SHUTDOWN, `-`, '', []);
    }

    fork(
        nextStage: Stage,
        defer: IConsumer<ACTIONS>,
        joinsInto: string []
    ): StateMachineImpl<any, any, any> {
        this._status = StateMachineStatus.PAUSED;
        let forkSmName = `${this.data.name}/${nextStage.state}`;
        StateMachineLogger.log(this.data.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.FORK, this.transactionTree.getCurrentTransactionId(), `[FORK]::${forkSmName}`);

        return StateMachineFactory.fork(
            forkSmName,
            {
                stateMachine: this,
                joinsInto
            },
            nextStage,
            this.data.stageDefsByKey[nextStage.state],
            defer
        );
    }

    createActions(
        stateMachine: SmController<any, any>,
        actionsByStage: IKeyValuePairs<StageDef<string, any, any, any>>,
        stageName: string,
        stagePayload: any,
    ) {
        let stageDef: StageDef<string, any, any, any> = actionsByStage [stageName];
        if (!stageDef || !stageDef.logic) return {};

        let actionsLogic: any = StageLogicParser.parse(stageDef.logic)(stagePayload);
        let proxy: any = {} as any;
        let prototype = Object.getPrototypeOf(actionsLogic);
        let methodHost = prototype.constructor.name === 'Object' ? actionsLogic : prototype;
        let ownPropertyNames = Object.getOwnPropertyNames(methodHost);
        ownPropertyNames.forEach(key => {
            if (key === 'constructor') return;
            let toProxy = (methodHost as any)[key];
            if (typeof toProxy !== 'function') return;

            (proxy as any)[key] = (payload: any) => {
                let nextStage: Stage = (actionsLogic as any)[key](payload);
                let nextStageDef: StageDef<string, any, any, any> = actionsByStage [nextStage.state];
                if (nextStageDef == null) {
                    if (!this.data.parent) {
                        throw new Error(`trying to move to a non existent stage: ${nextStage.state}`);
                    }

                    nextStageDef = this.data.parent.stateMachine.getStageDef(nextStage.state);
                    if (!nextStageDef) {
                        throw new Error(`trying to move to a non existent stage from a forked stateMachine: ${nextStage.state}`);
                    }
                }


                StateMachineLogger.log(this.data.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.PROXY, this.transactionTree.getCurrentTransactionId(), `(${key})=>::${nextStage.state}`);
                stateMachine.requestTransition({
                    actionName: key,
                    payload: payload,
                    transition: nextStage,
                });
            }
        });
        return proxy;
    }

    join(stageToProcess: StageToProcess): void {
        let stageName = stageToProcess.stage.state;
        let stageDescriptor = `::${stageName}`;
        StateMachineLogger.log(this.data.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.FORK_JOIN, this.transactionTree.getCurrentTransactionId(), `<-::${stageName}`);
        this.requestStage({
            type: ToProcessType.STAGE,
            eventType: EventType.FORK_JOIN,
            description: stageDescriptor,
            stage: stageToProcess.stage
        });
    }

    deleteListeners(listenerNames: string[]) {
        if (listenerNames.length === 0) return;

        let newListeners: SmListenerDefList<SM_ON_LISTENER> = [];
        this.data.listeners.forEach(currentListener=>{
            if (listenerNames.indexOf(currentListener.metadata.name) > -1) {
                StateMachineLogger.log(this.data.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.DELETE_LISTENER, this.transactionTree.getCurrentTransactionId(), `-(${currentListener.metadata.name})[${currentListener.metadata.executionType}]`);
            } else {
                newListeners.push(currentListener)
            }
        });
        this.data.listeners = newListeners;
    }

    private flagAsRunning(details: string) {
        StateMachineLogger.log(this.data.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.REQUEST, this.transactionTree.getCurrentTransactionId(), `+::${details}`);
        this._status = StateMachineStatus.RUNNING;
    }

    private sleep() {
        this._status = StateMachineStatus.IDLE;
        StateMachineLogger.log(this.data.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.SLEEP, this.transactionTree.getCurrentTransactionId(), ``);
    }

    private assertNotClosed() {
        if (this.closed) {
            throw new Error(`can't perform any actions in a SM once the SM is closed`);
        }
    }
}
