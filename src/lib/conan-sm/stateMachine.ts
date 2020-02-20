import {StateMachineData} from "./stateMachineTree";
import {EventThread} from "./eventThread";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {Stage, StageDef} from "./stage";
import {IConsumer, IKeyValuePairs, WithMetadataArray} from "../conan-utils/typesHelper";
import {ReactionsFactory} from "./reactionsFactory";
import {Strings} from "../conan-utils/strings";
import {StateMachineFactory} from "./stateMachineFactory";
import {
    ListenerType,
    SmEventCallback,
    SmEventCallbackParams,
    SmListener,
    SmListenerDefLike,
    SmListenerDefLikeParser,
    SmListenerDefList
} from "./stateMachineListeners";
import {ifTransitionTypeIs, SerializedSmEvent, SmEvent, SmTransition} from "./stateMachineEvents";
import {SmController} from "./_domain";
import {StageTransaction, StateMachineTransactions} from "./stageTransaction";

export enum ToProcessType {
    ACTION = 'ACTION',
    STAGE = 'STAGE'
}

interface ActionToProcess extends BaseToProcess {
    type: ToProcessType.ACTION;
    actionName: string;
    payload?: any;
    into: Stage;
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

export type ToProcess = StageToProcess | ActionToProcess;

export interface ParentStateMachineInfo<SM_LISTENER extends SmListener,
    JOIN_LISTENER extends SmListener,
    > {
    stateMachine: StateMachine<SM_LISTENER, JOIN_LISTENER, any>,
    joinsInto: string[]
}

export class StateMachine<SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS,
    > implements SmController<SM_ON_LISTENER, SM_IF_LISTENER> {
    readonly eventThread: EventThread = new EventThread();

    private closed: boolean = false;
    private readonly smListenerDefLikeParser: SmListenerDefLikeParser = new SmListenerDefLikeParser();
    private readonly stateMachineTransactions: StateMachineTransactions = new StateMachineTransactions(this);

    constructor(
        readonly data: StateMachineData<SM_ON_LISTENER, SM_IF_LISTENER>,
        readonly stageDefsByKey: IKeyValuePairs<StageDef<string, any, any, any>>,
        private readonly parent?: ParentStateMachineInfo<any, any>,
    ) {
    }

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.assertNotClosed();
        let listenerDef = this.smListenerDefLikeParser.parse(listener);
        StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName(), EventType.ADD_LISTENER, this.stateMachineTransactions.getCurrentTransactionId(),`(${listenerDef.metadata})[${type}]`);
        this.data.request.stateMachineListeners.push(listenerDef);
        return this;
    }

    addInterceptor(interceptor: SmListenerDefLike<SM_IF_LISTENER>): this {
        let listenerDef = this.smListenerDefLikeParser.parse(interceptor);
        StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName(), EventType.ADD_INTERCEPTOR, this.stateMachineTransactions.getCurrentTransactionId(),`(${listenerDef.metadata})`);
        this.data.request.stateMachineInterceptors.push(
            this.smListenerDefLikeParser.parse(interceptor)
        );
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

    requestStage(stageToProcess: StageToProcess): void {
        this.assertNotClosed();

        this.stateMachineTransactions.createStageTransaction(
            {
                type: ToProcessType.STAGE,
                stage: stageToProcess.stage,
                description: `::${stageToProcess.stage.name}`,
                eventType: EventType.STAGE
            },
            stageToProcess => this.publishStage(stageToProcess),
            (result)=>{
                if (result.toProcess.length > 1) throw new Error('Only one transition can be queued to be executed on the back of an event being raised');
                if (result.toProcess.length === 0) return;

                let toProcess = result.toProcess[0] as ActionToProcess;
                let description = `=>${toProcess.actionName}::${toProcess.into.name}`;
                this.addInterceptor([description, {
                    [Strings.camelCaseWithPrefix('on', toProcess.actionName)]: (_, params)=>this.requestStage({
                        description,
                        eventType: EventType.STAGE,
                        stage: toProcess.into,
                        type: ToProcessType.STAGE
                    })
                } as SM_IF_LISTENER ]);
                this.publishAction(toProcess);
            }
        );
    }

    requestTransition(transition: SmTransition): this {
        this.assertNotClosed();

        this.stateMachineTransactions
            .retrieveCurrentStageTransaction()
            .retrieveTransitionQueue(transition)
            .pushRequest({
                description: `=>${transition.path}::${transition.into.name}`,
                actionName: transition.path,
                into: transition.into,
                payload: transition.payload,
                eventType: EventType.ACTION,
                type: ToProcessType.ACTION,
            });

        return this;
    }

    publishStage(stageToProcess: StageToProcess): void {
        let intoStageName = stageToProcess.stage.name;
        StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName(), EventType.STAGE, this.stateMachineTransactions.getCurrentTransactionId(), `${stageToProcess.description}`);

        if (this.parent && this.parent.joinsInto.indexOf(stageToProcess.stage.name) !== -1) {
            StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName(), EventType.FORK_STOP, this.stateMachineTransactions.getCurrentTransactionId(),`=>joining back ${intoStageName}`);
            this.addListener([
                `(continueOnParent=>${stageToProcess.stage.name})`,
                {
                    onStop: () => {
                        this.parent.stateMachine.requestTransition({
                            path: 'doForkJoin',
                            into: stageToProcess.stage
                        });
                        this.parent.stateMachine.stateMachineTransactions.retrieveCurrentStageTransaction().close ();
                    }
                } as any as SM_ON_LISTENER
            ], ListenerType.ONCE);
            this.requestTransition({
                into: {
                    name: 'stop'
                },
                path: 'doStop'
            });
            this.stateMachineTransactions.retrieveCurrentStageTransaction().close ();
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
            this.reactToEvent(this.eventThread.currentEvent, this.data.request.stateMachineListeners);
            this.stateMachineTransactions.retrieveCurrentStageTransaction().close ()
        }
    }


    publishAction(actionToProcess: ActionToProcess): void {
        StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName(), EventType.ACTION, this.stateMachineTransactions.getCurrentTransactionId(), '=>' + actionToProcess.actionName);

        let eventName = Strings.camelCaseWithPrefix('on', actionToProcess.actionName);
        let actionEvent = {

            path: eventName,
            into: actionToProcess.into
        };
        this.eventThread.addActionEvent(actionEvent);
        this.reactToEvent(this.eventThread.currentEvent, this.data.request.stateMachineInterceptors);
    }

    reactToEvent(event: SmEvent, listeners: SmListenerDefList<any>) {
        this.assertNotClosed();

        let currentStageName = this.eventThread.getCurrentStageName();
        let actions: ACTIONS = this.createProxy(this, this.stageDefsByKey, currentStageName, ifTransitionTypeIs(event, event => undefined, event => event.data.payload));
        let reactionsFactory = new ReactionsFactory();
        let reactions: WithMetadataArray<SmEventCallback<ACTIONS>, string> = [];

        let listenerReactions = reactionsFactory.create(event, actions, listeners);
        reactions.push(...listenerReactions);

        // StateMachineLogger.log(this.data.request.name, currentStageName, this.currentTransitionId, EventType.REACTING, `pending reactions: [${reactions.length}]`);
        reactions.forEach((it, i) => {
            StateMachineLogger.log(this.data.request.name, currentStageName, EventType.REACTION_START, this.stateMachineTransactions.getCurrentTransactionId(), `(${it.metadata}): reaction ${i + 1} of ${reactions.length}`);
            it.value(actions, {sm: this});
        });
    }

    getEvents(): SerializedSmEvent [] {
        return this.eventThread.serialize();
    }


    getStageDef(name: string): StageDef<any, any, any> {
        return this.stageDefsByKey [name];
    }

    logAddedToQueue(description: string) {
        // StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName(), EventType.ADD_TO_QUEUE, `${description}`)
    }

    shutdown() {
        this.closed = true;
    }

    private assertNotClosed() {
        if (this.closed) {
            throw new Error(`can't perform any actions in a SM once the SM is closed`);
        }
    }

    logAboutToProcess(description: string) {
        // StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName(), EventType.PROCESS_FROM_QUEUE, `${description}`)
    }

    logJustProcessed(description: string) {
        // StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName(), EventType.JUST_PROCESSED, `${description}`)
    }

    logTransitionQueueCreated(_currentTransaction: StageTransaction, transition: SmTransition) {
        // StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName(), EventType.TRANSACTION, this.stateMachineTransactions.getCurrentTransactionId(),`${_currentTransaction.id}=>${transition.path}`)
    }

    logTransactionCreated(_currentTransaction: StageTransaction) {
        // StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName(), EventType.TRANSACTION, this.stateMachineTransactions.getCurrentTransactionId(),`${_currentTransaction.id}`)
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


                StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName(), EventType.PROXY, this.stateMachineTransactions.getCurrentTransactionId(), `(proxy::${key})=>requesting::${nextStage.name}`);
                stateMachine.requestTransition({
                    path: key,
                    payload: payload,
                    into: nextStage,
                });
            }
        });
        return proxy;
    }

    private fork(
        nextStage: Stage,
        defer: IConsumer<ACTIONS>,
        joinsInto: string []
    ): StateMachine<any, any, any> {
        StateMachineLogger.log(this.data.request.name, this.eventThread.getCurrentStageName(), EventType.FORK, this.stateMachineTransactions.getCurrentTransactionId(),`forking deferred stage: ${nextStage.name}`);
        let deferEventName = Strings.camelCaseWithPrefix('on', nextStage.name);
        let deferPathName = Strings.camelCaseWithPrefix('do', nextStage.name);
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
                stateMachineListeners: [
                    {
                        metadata: `::${deferEventName}->[DEFERRED],::start=>${deferPathName}`,
                        value: {
                            onStart: (_: any, params: SmEventCallbackParams)=>params.sm.requestTransition({
                                path: deferPathName,
                                into: nextStage,
                            }),
                            [deferEventName]: (actions: any) => defer(actions)
                        }
                    }
                ],
                stateMachineInterceptors: [],
                syncStateMachineDefs: undefined,
            }
        });
    }
}
