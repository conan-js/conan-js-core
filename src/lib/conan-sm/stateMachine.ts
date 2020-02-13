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
import {ifTransitionTypeIs, SerializedSmEvent, SmEvent, SmEventType, SmTransition} from "./stateMachineEvents";
import {SmController} from "./_domain";

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
    stateMachine: StateMachine<SM_LISTENER, JOIN_LISTENER, any>,
    joinsInto: string[]
}

export class StateMachine<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS,
> implements SmController<SM_ON_LISTENER, SM_IF_LISTENER> {
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

    requestTransition(transition: SmTransition): this {
        this.assertNotClosed();
        StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName (), EventType.REQUEST_TRANSITION, `=>transition[${transition.path}::${transition.into.name}]`);
        this.doRequest({
            actionName: transition.path,
            into: transition.into,
            payload: transition.payload,
            eventType: EventType.ACTION,
        });
        return this;
    }

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.assertNotClosed();
        let listenerDef = this.smListenerDefLikeParser.parse(listener);
        StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName (), EventType.ADDING_REACTION, `adding ASAP reaction: ${listenerDef.metadata}`);
        this.data.request.nextReactionsQueue.push(listenerDef);
        return this;
    }

    stop(): this {
        this.assertNotClosed();
        this.requestTransition({
            into: {
                name: 'stop'
            },
            path: 'doStop',
        });
        return this;
    }

    publishEvent(event: SmEvent) {
        this.assertNotClosed();

        let currentStageName = this.eventThread.getCurrentStageName ();
        let actions: ACTIONS = this.createProxy(this, this.stageDefsByKey, currentStageName, ifTransitionTypeIs(event, event=>undefined, event=>event.data.payload));
        let reactionsFactory = new ReactionsFactory();
        let reactions: WithMetadataArray<SmEventCallback<ACTIONS>, string> = [];

        let asapReactions = reactionsFactory.create(event, actions, this.data.request.nextReactionsQueue.read());
        let smListeners = event.type === SmEventType.STAGE ? this.data.request.stateMachineListeners : this.data.request.stateMachineInterceptors;
        let listenerReactions = reactionsFactory.create(event, actions, smListeners);
        reactions.push(...listenerReactions);
        reactions.push(...asapReactions);

        StateMachineLogger.log(this.data.request.name, currentStageName, EventType.PUBLISH, `${event.eventName}::pending reactions: [${reactions.length}]`, event.eventName);
        reactions.forEach((it, i) => {
            StateMachineLogger.log(this.data.request.name, currentStageName, EventType.REACTION_START, `START [${it.metadata}]: reaction ${i + 1} of ${reactions.length}`);
            it.value(actions, {sm: this});
            StateMachineLogger.log(this.data.request.name, currentStageName, EventType.REACTION_END, `END [${it.metadata}]`)
        });
    }

    addInterceptor(interceptor: SmListenerDefLike<SM_IF_LISTENER>): this {
        this.data.request.stateMachineInterceptors.push(
            this.smListenerDefLikeParser.parse(interceptor)
        );
        return this;
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
            StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName (), EventType.QUEUE_TO_PROCESS, `queueing: ${(toProcess as ActionToProcess).actionName ?
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
                StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName (), EventType.STOP, `cancelling queued events since a stop has been signalled`);
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
        StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName (), EventType.REQUEST_ACTION, `=>processing action [${actionToProcess.actionName}]`);

        let eventName = Strings.camelCaseWithPrefix('on', actionToProcess.actionName);
        this.addInterceptor([
            `${eventName}=>${actionToProcess.into.name}`,
            {
                [eventName]: () => this.doRequest({
                    stage: actionToProcess.into,
                    eventType: EventType.REQUEST_STAGE
                } as StageToProcess)
            } as any as SM_IF_LISTENER
        ]);

        this.eventThread.addActionEvent({

            path: eventName,
            into: actionToProcess.into
        });
        this.publishEvent(this.eventThread.currentEvent);
    }

    getEvents(): SerializedSmEvent [] {
        return this.eventThread.serialize();
    }

    private processStageEvent(stageToProcess: StageToProcess): void {
        let intoStageName = stageToProcess.stage.name;
        StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName (), EventType.REQUEST_STAGE, `=>requesting stage ${intoStageName}`);

        if (this.parent && this.parent.joinsInto.indexOf(stageToProcess.stage.name) !== -1) {
            StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName (), EventType.FORK_STOP, `=>joining back ${intoStageName}`);
            this.requestTransition({
                into: {
                    name: 'stop'
                },
                path: 'doStop'
            });
            this.addListener([
                `(continueOnParent=>${stageToProcess.stage.name})`,
                {
                    onStop: () => {
                        this.parent.stateMachine.requestTransition({
                            path: 'doForkJoin',
                            into: stageToProcess.stage
                        });
                    }
                } as any as SM_ON_LISTENER
            ], ListenerType.ONCE);
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


    getStageDef(name: string): StageDef<any, any, any> {
        return this.stageDefsByKey [name];
    }

    private createProxy(
        stateMachine: SmController<any, any>,
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


                StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName (), EventType.PROXY, `(proxy::${key})=>requesting::${nextStage.name}`);
                stateMachine.requestTransition({
                    path: key,
                    payload: payload,
                    into: nextStage,
                });
            }
        });
        return proxy;
    }

    shutdown() {
        this.closed = true;
    }

    private assertNotClosed() {
        if (this.closed) {
            throw new Error(`can't perform any actions in a SM once the SM is closed`);
        }
    }

    private fork(
        nextStage: Stage,
        defer: IConsumer<ACTIONS>,
        joinsInto: string []
    ): StateMachine<any, any, any> {
        StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName (), EventType.FORK, `forking deferred stage: ${nextStage.name}`);
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
                stateMachineInterceptors: [],
                syncStateMachineDefs: undefined,
                nextConditionalReactionsQueue: new Queue(),
                nextReactionsQueue: new Queue()
            }
        });
    }
}
