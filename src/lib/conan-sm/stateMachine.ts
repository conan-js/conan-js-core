import {SerializedSmEvent, SmEvent} from "./domain";
import {StateMachineData} from "./stateMachineTree";
import {EventThread} from "./eventThread";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {Stage, StageDef} from "./stage";
import {IConsumer, IKeyValuePairs, WithMetadataArray} from "../conan-utils/typesHelper";
import {ReactionsFactory} from "./reactionsFactory";
import {Strings} from "../conan-utils/strings";
import {StateMachineFactory} from "./stateMachineFactory";
import {Queue} from "./queue";
import {
    ListenerType,
    SmEventCallback,
    SmListener,
    SmListenerDefLike,
    SmListenerDefLikeParser
} from "./stateMachineListeners";

export interface SmEventsPublisher<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
> {
    addListener(type: ListenerType, listener: SmListenerDefLike<SM_ON_LISTENER>): this;
}

export interface StateMachine<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
> extends SmEventsPublisher<SM_ON_LISTENER, SM_IF_LISTENER> {

    requestStage(stage: Stage): this;

    requestTransition(methodName: string, payload: any, stage: Stage): this;

    stop(): this;

    getEvents(): SerializedSmEvent [];

    getStageDef(name: string): StageDef<any, any, any>;
}

interface ActionToProcess {
    actionName: string;
    payload?: any;
    eventType: EventType;
    into: Stage;
}

interface StageToProcess {
    stage: Stage;
    eventType: EventType;
}

export type ToProcess = StageToProcess | ActionToProcess;

export interface ParentStateMachineInfo<SM_LISTENER extends SmListener,
    JOIN_LISTENER extends SmListener,
    > {
    stateMachine: StateMachine<SM_LISTENER, JOIN_LISTENER>,
    joinsInto: string[]
}

export class StateMachineImpl<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS,
> implements StateMachine<SM_ON_LISTENER, SM_IF_LISTENER> {
    readonly eventThread: EventThread = new EventThread();
    private processing: boolean = false;
    private toProcessQueue: ToProcess[] = [];
    private closed: boolean = false;
    private readonly smListenerDefLikeParser: SmListenerDefLikeParser = new SmListenerDefLikeParser();

    constructor(
        readonly data: StateMachineData<SM_ON_LISTENER, SM_IF_LISTENER>,
        readonly stageDefsByKey: IKeyValuePairs<StageDef<string, any, any, any>>,
        private readonly parent?: ParentStateMachineInfo<any, any>,
    ) {
    }

    requestStage(stage: Stage): this {
        this.assertNotClosed();
        this.doRequest({
            stage,
            eventType:  stage.name === 'stop' ? EventType.STOP :
                        stage.name === 'start' ? EventType.INIT:
                        EventType.REQUEST_STAGE
        } as StageToProcess);
        return this;
    }

    requestTransition(methodName: string, payload: any, stage: Stage): this {
        this.assertNotClosed();
        StateMachineLogger.log(this.data.request.name, this.eventThread.currentEvent ? this.eventThread.currentEvent.stageName : '-', EventType.REQUEST_TRANSITION, `=>transition[${methodName}::${stage.name}]`);
        this.doRequest({
            actionName: methodName,
            into: stage,
            payload: payload,
            eventType: EventType.ACTION,
        });
        return this;
    }

    nextConditionally(listener: SmListenerDefLike<SM_IF_LISTENER>): this {
        this.assertNotClosed();
        throw new Error('TBI');
    }

    addListener(type: ListenerType, listener: SmListenerDefLike<SM_ON_LISTENER>): this {
        this.assertNotClosed();
        let listenerDef = this.smListenerDefLikeParser.parse(listener);
        StateMachineLogger.log(this.data.request.name, this.eventThread && this.eventThread.currentEvent ? this.eventThread.currentEvent.stageName : '', EventType.ADDING_REACTION, `adding ASAP reaction: ${listenerDef.metadata}`);
        this.data.request.nextReactionsQueue.push(listenerDef);
        return this;
    }

    stop(): this {
        this.assertNotClosed();
        this.requestStage({name: 'stop'});
        return this;
    }

    publishEvent(event: SmEvent) {
        this.assertNotClosed();

        let actions: ACTIONS = this.createProxy(this, this.stageDefsByKey, event.stageName, event.payload);
        let reactionsFactory = new ReactionsFactory();
        let reactions: WithMetadataArray<SmEventCallback<ACTIONS>, string> = [];

        let asapReactions = reactionsFactory.create(event, actions, this.data.request.nextReactionsQueue.read());
        let listenerReactions = reactionsFactory.create(event, actions, this.data.request.stateMachineListeners);
        reactions.push(...listenerReactions);
        reactions.push(...asapReactions);

        StateMachineLogger.log(this.data.request.name, this.eventThread.currentEvent.stageName, EventType.PUBLISH, `${event.eventName}::pending reactions: [${reactions.length}]`, event.eventName);
        reactions.forEach((it, i) => {
            StateMachineLogger.log(this.data.request.name, event.stageName, EventType.REACTION_START, `START [${it.metadata}]: reaction ${i + 1} of ${reactions.length}`);
            it.value(actions, {sm: this});
            StateMachineLogger.log(this.data.request.name, event.stageName, EventType.REACTION_END, `END [${it.metadata}]`)
        });
    }

    private doRequest(toProcess: ToProcess): void {
        if (!this.processing) {
            this.processing = true;
            if ((toProcess as ActionToProcess).actionName) {
                this.processActionEvent(toProcess as ActionToProcess);
            } else {
                this.processStageEvent(toProcess as StageToProcess);
            }
            this.processPendingEvents();
            this.processing = false;
        } else {
            StateMachineLogger.log(this.data.request.name, this.eventThread.currentEvent.stageName, EventType.QUEUE_TO_PROCESS, `queueing: ${(toProcess as ActionToProcess).actionName ?
                `action [${(toProcess as ActionToProcess).actionName}]` :
                `stage [${(toProcess as StageToProcess).stage.name}]`
            }`);
            this.toProcessQueue.push(toProcess)
        }

    }

    private processPendingEvents(): void {
        if (this.toProcessQueue.length === 0) return;

        let pendingStages: ToProcess[] = [...this.toProcessQueue];
        this.toProcessQueue = [];
        pendingStages.forEach(it => {
            if (this.closed) {
                StateMachineLogger.log(this.data.request.name, this.eventThread.currentEvent ? this.eventThread.currentEvent.stageName : '-', EventType.STOP, `cancelling queued events since a stop has been signalled`);
                return;
            }
            if ((it as ActionToProcess).actionName) {
                this.processActionEvent(it as ActionToProcess);
            } else {
                this.processStageEvent(it as StageToProcess);
            }
        });
        this.processPendingEvents();
    }

    private processActionEvent(actionToProcess: ActionToProcess): void {
        StateMachineLogger.log(this.data.request.name, this.eventThread.currentEvent ? this.eventThread.currentEvent.stageName : '-', EventType.REQUEST_ACTION, `=>processing action [${actionToProcess.actionName}]`);

        let eventName = Strings.camelCaseWithPrefix('on', actionToProcess.actionName);
        this.addListener(ListenerType.ONCE, [
            `${eventName}=>${actionToProcess.into.name}`,
            {
                [eventName]: () => this.requestStage(
                    actionToProcess.into
                )
            } as any as SM_ON_LISTENER
        ]);

        this.eventThread.addActionEvent(
            eventName,
            actionToProcess.payload,
        );
        this.publishEvent(this.eventThread.currentEvent);
    }

    private processStageEvent(stageToProcess: StageToProcess): void {
        let intoStageName = stageToProcess.stage.name;
        StateMachineLogger.log(this.data.request.name, this.eventThread.currentEvent ? this.eventThread.currentEvent.stageName : '-', EventType.REQUEST_STAGE, `=>requesting stage ${intoStageName}`);

        if (this.parent && this.parent.joinsInto.indexOf(stageToProcess.stage.name) !== -1) {
            StateMachineLogger.log(this.data.request.name, this.eventThread.currentEvent ? this.eventThread.currentEvent.stageName : '-', EventType.FORK_STOP, `=>joining back ${intoStageName}`);
            this.requestStage({name: 'stop'});
            this.addListener(ListenerType.ONCE, [
                `(continueOnParent=>${stageToProcess.stage.name})`,
                {
                    onStop: () => {
                        this.parent.stateMachine.requestStage(stageToProcess.stage);
                    }
                } as any as SM_ON_LISTENER
            ]);
            return
        }


        let stageDef = this.stageDefsByKey [intoStageName];
        if (stageDef && stageDef.deferredInfo) {
            this.eventThread.currentEvent.fork = this.fork(
                stageToProcess.stage,
                (actions) => stageDef.deferredInfo.deferrer(actions, stageToProcess.stage.requirements),
                stageDef.deferredInfo.joinsInto
            );
        } else {
            this.eventThread.addStageEvent(
                stageToProcess.stage,
                Strings.camelCaseWithPrefix('on', stageToProcess.stage.name)
            );
            this.publishEvent(this.eventThread.currentEvent);
        }
    }

    getEvents(): SerializedSmEvent [] {
        return this.eventThread.serialize();
    }

    private createProxy(
        stateMachine: StateMachine<any, any>,
        actionsByStage: IKeyValuePairs<StageDef<string, any, any, any>>,
        stageName: string,
        stagePayload: any,
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
                let nextStage: Stage = (actionsLogic as any)[key](payload);
                let nextStageDef: StageDef<string, any, any, any> = actionsByStage [nextStage.name];
                if (nextStageDef == null) {
                    if (!this.parent) {
                        throw new Error(`trying to move to a non existent stage: ${nextStage.name}`);
                    }

                    nextStageDef = this.parent.stateMachine.getStageDef(nextStage.name);
                    if (!nextStageDef) {
                        throw new Error(`trying to move to a non existent stage from a forked stateMachine: ${nextStage.name}`);
                    }
                }


                StateMachineLogger.log(this.data.request.name, this.eventThread.currentEvent.stageName, EventType.PROXY, `(proxy::${key})=>requesting::${nextStage.name}`);
                stateMachine.requestTransition(
                    key,
                    payload,
                    nextStage,
                );
            }
        });
        return proxy;
    }


    getStageDef(name: string): StageDef<any, any, any> {
        return this.stageDefsByKey [name];
    }

    private fork(
        nextStage: Stage,
        defer: IConsumer<ACTIONS>,
        joinsInto: string []
    ): StateMachineImpl<any, any, any> {
        StateMachineLogger.log(this.data.request.name, this.eventThread.currentEvent.stageName, EventType.FORK, `forking deferred stage: ${nextStage.name}`);
        let deferEventName = Strings.camelCaseWithPrefix('on', nextStage.name);
        return StateMachineFactory.fork({
            stateMachine: this,
            joinsInto
        }, {
            request: {
                name: `${this.data.request.name}/${nextStage.name}`,
                stageDefs: [{
                    name: nextStage.name,
                    logic: this.stageDefsByKey[nextStage.name].logic
                }],
                nextStagesQueue: new Queue<Stage>([{name: 'start'}, nextStage]),
                stateMachineListeners: [
                    {
                        metadata: `${deferEventName}=>(autoDefer)`,
                        value: {
                            [deferEventName]: (actions: any) => defer(actions)
                        }
                    }
                ],
                syncStateMachineDefs: undefined,
                nextConditionalReactionsQueue: new Queue(),
                nextReactionsQueue: new Queue()
            }
        });
    }

    shutdown() {
        this.closed = true;
    }

    private assertNotClosed() {
        if (this.closed) {
            throw new Error(`can't perform any actions in a SM once the SM is closed`);
        }
    }
}
