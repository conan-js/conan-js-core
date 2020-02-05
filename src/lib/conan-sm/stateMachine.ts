import {SMJoinerDef, SMListenerDef, SmListenersByType, StateMachineListenerDefs} from "./stateMachineListenerDefs";
import {SerializedSmEvent, SmEvent, SmListener, TriggerType} from "./domain";
import {StateMachineData} from "./stateMachineStarter";
import {EventThread} from "./eventThread";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {Stage, StageDef} from "./stage";
import {ICallback, IConsumer, IKeyValuePairs, WithMetadataArray} from "../conan-utils/typesHelper";
import {ReactionsFactory} from "./reactionsFactory";
import {Strings} from "../conan-utils/strings";
import {StateMachineFactory} from "./stateMachineFactory";
import {Queue} from "./queue";

export interface StateMachineEndpoint<SM_LISTENER extends SmListener,
    JOIN_LISTENER extends SmListener,
    > {
    onceAsap(name: string, requestListeners: SMListenerDef<SM_LISTENER, StateMachine<SM_LISTENER, JOIN_LISTENER>>): this;

    conditionallyOnce(name: string, ifStageListeners: SMJoinerDef<JOIN_LISTENER, StateMachine<SM_LISTENER, JOIN_LISTENER>>): this;

    requestStage(stage: Stage<string, any, any>, triggerType: TriggerType, eventType: EventType, pathName: string, close: boolean, actionName?: string, payload?: any, eventThread ?: EventThread): this;

}

export interface StateMachine<SM_LISTENER extends SmListener,
    JOIN_LISTENER extends SmListener,
    > extends StateMachineEndpoint<SM_LISTENER, JOIN_LISTENER> {
    requestTransition(methodName: string, payload: any, stage: Stage<string, any, any>, triggerType: TriggerType, eventType: EventType, pathName: string, close: boolean, actionName?: string, eventThread ?: EventThread): this;

    stop(): this;

    joinPath(pathName: string): this;

    getEvents(): SerializedSmEvent [];

    getStageDef(name: string): StageDef<any, any, any>;
}

interface ActionToProcess {
    actionName: string;
    into: StageToProcess;
}

interface StageToProcess {
    stage: Stage<string, any, any>;
    triggerType: TriggerType;
    eventType: EventType;
    pathName: string;
    actionName?: string;
    payload?: any;
    close: boolean;
    eventThread?: EventThread;
}

export type ToProcess = StageToProcess | ActionToProcess;

export class StateMachineImpl<SM_LISTENER extends SmListener,
    JOIN_LISTENER extends SmListener,
    ACTIONS,
    > implements StateMachine<SM_LISTENER, JOIN_LISTENER> {
    private eventThread: EventThread;
    private listeners: SmListenersByType<SM_LISTENER, JOIN_LISTENER>;
    private processing: boolean = false;
    private toProcessQueue: ToProcess[] = [];

    constructor(
        private readonly data: StateMachineData<SM_LISTENER, JOIN_LISTENER, ACTIONS>,
        private readonly stageDefsByKey: IKeyValuePairs<StageDef<string, any, any, any>>,
        private readonly parent?: StateMachine<any, any>,
    ) {
    }

    init(thread: EventThread, listeners: SmListenersByType<SM_LISTENER, JOIN_LISTENER>): void {
        this.eventThread = thread;
        this.listeners = listeners;
        let initialStages = this.data.request.nextStagesQueue.flush();
        StateMachineLogger.log(this.data.request.name, '', EventType.INIT, `starting SM: `, undefined, [
            [`listeners`, `${this.data.request.stateMachineListenerDefs.listeners.whileRunning.map(it => it.metadata)}`],
            [`by path`, `${JSON.stringify(this.data.request.stateMachineListenerDefs.listeners.listenersByPath)}`],
            [`initial stages`, `${initialStages.map(it => it.name).join(', ')}`],
        ]);

        initialStages.forEach(it => {
            this.requestStage(it, TriggerType.START, EventType.INIT, undefined, false);
        });
    }


    requestStage(stage: Stage<string, any, any>, triggerType: TriggerType, eventType: EventType, pathName: string, close: boolean, actionName?: string, payload?: any, eventThread ?: EventThread): this {
        this.doRequest({
            eventType,
            pathName,
            stage,
            triggerType,
            actionName,
            payload,
            close,
            eventThread
        });
        return this;
    }

    requestTransition(methodName: string, payload: any, stage: Stage<string, any, any>, triggerType: TriggerType, eventType: EventType, pathName: string, close: boolean, actionName?: string, eventThread?: EventThread): this {
        StateMachineLogger.log(this.data.request.name, this.eventThread.currentStage ? this.eventThread.currentStage.name : '-', EventType.REQUEST_TRANSITION, `=>transition[${methodName}::${stage.name}]`);
        this.doRequest({
            actionName: methodName,
            into: {
                eventType,
                pathName,
                stage,
                triggerType,
                actionName,
                payload,
                close,
                eventThread
            }
        });
        return this;
    }

    private doRequest (toProcess: ToProcess): void{
        if (!this.processing) {
            this.processing = true;
            if (toProcess.actionName) {
                this.processAction(toProcess as ActionToProcess);
            } else {
                this.processStage(toProcess as StageToProcess);
            }
            this.processPending();
            this.processing = false;
        } else {
            StateMachineLogger.log(this.data.request.name, this.eventThread.currentStage.name, EventType.QUEUE_TO_PROCESS, `queueing: ${toProcess.actionName ? 
                `action [${toProcess.actionName}]`: 
                `stage [${(toProcess as StageToProcess).stage.name}]`
            }`);
            this.toProcessQueue.push(toProcess)
        }

    }

    private processPending(): void {
        if (this.toProcessQueue.length === 0) return;

        let pendingStages: ToProcess[] = [...this.toProcessQueue];
        this.toProcessQueue = [];
        pendingStages.forEach(it => {
            if (it.actionName) {
                this.processAction(it as ActionToProcess);
            } else {
                this.processStage(it as StageToProcess);
            }
        });
        this.processPending();
    }

    private processAction(actionToProcess: ActionToProcess): void {
        StateMachineLogger.log(this.data.request.name, this.eventThread.currentStage ? this.eventThread.currentStage.name : '-', EventType.REQUEST_ACTION, `=>processing action [${actionToProcess.actionName}]`);
        let actualThread = this.eventThread;
        if (actionToProcess.into.eventThread) {
            actualThread = actionToProcess.into.eventThread;
        }

        let eventName = Strings.camelCaseWithPrefix('on', actionToProcess.actionName);
        // @ts-ignore
        this.onceAsap(`${eventName}=>${actionToProcess.into.stage.name}`, {
            [eventName]: {
                then: ()=> this.requestStage(
                    actionToProcess.into.stage,
                    actionToProcess.into.triggerType ? actionToProcess.into.triggerType : TriggerType.ACTION_FROM,
                    EventType.REQUEST_STAGE,
                    '',
                    actionToProcess.into.close
                )
            }
        });

        actualThread.doStage(
            this.eventThread.currentStage,
            actionToProcess.into.triggerType ? actionToProcess.into.triggerType : TriggerType.ACTION_FROM,
            eventName,
            actionToProcess.into.payload,
            true
        )
    }

    private processStage(stageToProcess: StageToProcess): void {
        let intoStageName = stageToProcess.stage.name;
        StateMachineLogger.log(this.data.request.name, this.eventThread.currentStage ? this.eventThread.currentStage.name : '-', EventType.REQUEST_STAGE, `=>requesting stage ${intoStageName}`);
        let actualThread = this.eventThread;
        if (stageToProcess.eventThread) {
            actualThread = stageToProcess.eventThread;
        }


        let stageDef = this.stageDefsByKey [intoStageName];
        if (stageDef && stageDef.deferrer) {
            this.fork(
                stageToProcess.stage,
                (actions)=>stageDef.deferrer (actions, stageToProcess.payload)
            )
        } else {
            actualThread.moveToStage(stageToProcess.stage, stageToProcess.triggerType);
        }
    }

    conditionallyOnce(name: string, ifStageListeners: SMJoinerDef<JOIN_LISTENER, StateMachine<SM_LISTENER, JOIN_LISTENER>>): this {
        throw new Error('TBI');
    }

    onceAsap(name: string, requestListeners: SMListenerDef<SM_LISTENER, StateMachine<SM_LISTENER, JOIN_LISTENER>>): this {
        this.data.request.nextReactionsQueue.push({
            metadata: name,
            value: requestListeners
        });
        return this;
    }

    joinPath(pathName: string): this {
        this.eventThread.switchPaths(pathName);
        return this;
    }

    stop(): this {
        this.eventThread.close();
        this.data.request.stopListeners.forEach(stopListener => {
            stopListener(this.getEvents());
        });
        return this;
    }

    getEvents(): SerializedSmEvent [] {
        return this.eventThread.serialize();
    }

    publishEvent(eventThread: EventThread, event: SmEvent) {
        let actions: ACTIONS = this.createProxy(this, this.stageDefsByKey, event.stageName, event.payload, event.currentPath, eventThread, false);
        let reactionsFactory = new ReactionsFactory();
        let reactions: ICallback [] = [];

        let whileRunningListeners = this.listeners.whileRunning.map(it => it.value);
        let listenersByPathElement = this.listeners.listenersByPath [event.currentPath];

        reactions.push(...reactionsFactory.create(event, actions, whileRunningListeners));
        if (listenersByPathElement) {
            reactions.push(...reactionsFactory.create(event, actions, listenersByPathElement.value));
        }
        reactions.push(...this.requestedReactionsProvider(event, actions));

        StateMachineLogger.log(this.eventThread.name, this.eventThread.currentStage.name, EventType.PUBLISH, `${event.eventName}::pending reactions: [${reactions.length}]`, event.eventName);
        reactions.forEach((it, i) => {
            StateMachineLogger.log(this.eventThread.name, event.stageName, EventType.REACTION_START, `reaction ${i + 1} of ${reactions.length}`);
            it();
            StateMachineLogger.log(this.eventThread.name, event.stageName, EventType.REACTION_END, `reaction ${i + 1} of ${reactions.length}`)
        });
    }


    private requestedReactionsProvider(event: SmEvent, actions: ACTIONS): ICallback[] {
        let listenersDef: WithMetadataArray<SMListenerDef<SM_LISTENER, any>, any> = this.data.request.nextReactionsQueue.flush();
        let listeners: WithMetadataArray<SM_LISTENER, any> = StateMachineListenerDefs.transformListeners(listenersDef, this);
        return new ReactionsFactory().create(event, actions, listeners.map(it => it.value));
    }

    private createProxy(
        stateMachine: StateMachine<any, any>,
        actionsByStage: IKeyValuePairs<StageDef<string, any, any, any>>,
        stageName: string,
        stagePayload: any,
        pathName: string,
        eventThread: EventThread,
        close: boolean
    ) {
        let stageDef: StageDef<string, any, any, any> = actionsByStage [stageName];
        if (!stageDef) return {};
        let actionsLogic: any = new stageDef.logic(stagePayload);
        let proxy: any = {} as any;
        let prototype = Object.getPrototypeOf(actionsLogic);
        Object.getOwnPropertyNames(prototype).forEach(key => {
            if (key === 'constructor') return;
            let toProxy = (prototype as any)[key];
            if (typeof toProxy !== 'function') return;

            (proxy as any)[key] = (payload: any) => {
                let nextStage: Stage<string, any, any> = (actionsLogic as any)[key](payload);
                let nextStageDef: StageDef<string, any, any, any> = actionsByStage [nextStage.name];
                if (nextStageDef == null) {
                    if (!this.parent) {
                        throw new Error(`trying to move to a non existent stage: ${nextStageDef.name}`);
                    }

                    if (!this.parent.getStageDef(nextStage.name)) {
                        throw new Error(`trying to move to a non existent stage from a forked stateMachine: ${nextStageDef.name}`);
                    }

                    this.eventThread.actionToStage(key, nextStage, payload);
                    this.requestStage({name: 'stop'}, TriggerType.STOP, EventType.ACTION, '', true);
                    this.parent.requestStage(nextStage, TriggerType.FORK_JOIN, EventType.ACTION, '', false);
                    return;
                }


                StateMachineLogger.log(this.data.request.name, this.eventThread.currentStage.name, EventType.PROXY, `(proxy::${key})=>requesting::${nextStage.name}`);
                stateMachine.requestTransition(
                    key,
                    payload,
                    nextStage,
                    nextStageDef.deferrer ? TriggerType.FORK_START : TriggerType.MOVE_TO_STAGE,
                    EventType.ACTION,
                    pathName,
                    close,
                    key,
                    eventThread
                );
            }
        });
        return proxy;
    }


    getStageDef(name: string): StageDef<any, any, any> {
        return this.stageDefsByKey [name];
    }

    private fork(
        nextStage: Stage<string, any, any>,
        defer: IConsumer<ACTIONS>,
    ): StateMachineImpl<any, any, any> {
        StateMachineLogger.log(this.data.request.name, this.eventThread.currentStage.name, EventType.FORK, `forking deferred stage: ${nextStage.name}`);
        return StateMachineFactory.fork(this,{
            request: {
                name: `${this.data.request.name}/${nextStage.name}`,
                stageDefs: [{
                    name: nextStage.name,
                    logic: this.stageDefsByKey[nextStage.name].logic
                }],
                nextStagesQueue: new Queue<Stage<string, any, any>>([{name: 'start'}, nextStage]),
                startingPath: this.data.request.startingPath,
                stateMachineListenerDefs:new StateMachineListenerDefs({
                    whileRunning: [
                        {
                            metadata: '(autoDefer)',
                            value: {
                                start: undefined,
                                [Strings.camelCaseWithPrefix('on', nextStage.name)]: {
                                    thenRequest: (actions: any)=> defer(actions)
                                },
                            }
                        }],
                    listenersByPath: {}
                }),
                syncStateMachineDefs: undefined,
                stopListeners: undefined,
                nextConditionalReactionsQueue: new Queue(),
                nextReactionsQueue: new Queue()
            }
        });
    }

}
