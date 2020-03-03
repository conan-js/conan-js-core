import {StateMachineRequest} from "./stateMachineTree";
import {EventThread} from "./eventThread";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {Stage, StageDef} from "./stage";
import {IConsumer, IKeyValuePairs, WithMetadataArray} from "../conan-utils/typesHelper";
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
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {SmController} from "./_domain";
import {SmTransactionRequest, StateMachineTransactions} from "./smTransaction";

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

export interface ParentStateMachineInfo<SM_LISTENER extends SmListener,
    JOIN_LISTENER extends SmListener,
    > {
    stateMachine: StateMachine<SM_LISTENER, JOIN_LISTENER, any>,
    joinsInto: string[]
}

export enum StateMachineStatus {
    IDLE = 'IDLE',
    RUNNING = 'RUNNING',
}

export class StateMachine<SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS,
    > implements SmController<SM_ON_LISTENER, SM_IF_LISTENER> {
    readonly eventThread: EventThread = new EventThread();
    private _status: StateMachineStatus = StateMachineStatus.IDLE;

    private closed: boolean = false;
    private readonly smListenerDefLikeParser: SmListenerDefLikeParser = new SmListenerDefLikeParser();
    private readonly stateMachineTransactions: StateMachineTransactions = new StateMachineTransactions();

    constructor(
        readonly request: StateMachineRequest<SM_ON_LISTENER, SM_IF_LISTENER>,
        readonly stageDefsByKey: IKeyValuePairs<StageDef<string, any, any, any>>,
        private readonly parent?: ParentStateMachineInfo<any, any>,
    ) {
    }

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.assertNotClosed();
        let listenerDef = this.smListenerDefLikeParser.parse(listener);
        StateMachineLogger.log(this.request.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.ADD_LISTENER, this.stateMachineTransactions.getCurrentTransactionId(), `(${listenerDef.metadata})[${type}]`);
        this.request.stateMachineListeners.push(listenerDef);
        return this;
    }

    addInterceptor(interceptor: SmListenerDefLike<SM_IF_LISTENER>): this {
        let listenerDef = this.smListenerDefLikeParser.parse(interceptor);
        StateMachineLogger.log(this.request.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.ADD_INTERCEPTOR, this.stateMachineTransactions.getCurrentTransactionId(), `(${listenerDef.metadata})`);
        this.request.stateMachineInterceptors.push(
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
        this._status = StateMachineStatus.RUNNING;
        StateMachineLogger.log(this.request.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.QUEUE, this.stateMachineTransactions.getCurrentTransactionId(), `::${stageToProcess.stage.name}`);
        this.stateMachineTransactions.createStageTransaction(this.createSmStageTransactionRequest(stageToProcess)).run();
    }

    requestTransition(transition: SmTransition): this {
        this.assertNotClosed();

        StateMachineLogger.log(this.request.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.QUEUE, this.stateMachineTransactions.getCurrentTransactionId(), `=>${transition.path}`);
        let description = `=>${transition.path}`;
        let toProcess: ActionToProcess = {
            description,
            actionName: transition.path,
            into: transition.into,
            payload: transition.payload,
            eventType: EventType.ACTION,
            type: ToProcessType.ACTION,
        };
        let eventName = Strings.camelCaseWithPrefix('on', transition.path);
        this.stateMachineTransactions
            .runTransitionTransaction(description, {
                stateMachine: this,
                target: transition,
                actions: this.createActions(this, this.stageDefsByKey, transition.into.name, transition.payload),
                onStart: {
                    metadata: `[notify-action]=>${transition.path}`,
                    value: () => {
                        this.eventThread.addActionEvent(
                            transition
                        );
                        StateMachineLogger.log(this.request.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.ACTION, this.stateMachineTransactions.getCurrentTransactionId(), `=>${transition.path}`);
                    }
                },
                reactionsProducer: () => {
                    return this.createReactions(eventName, this.request.stateMachineInterceptors);
                },
                onDone: {
                    metadata: `[request-stage]::${toProcess.into.name}`,
                    value: () => ({
                        chainId: `::${toProcess.into.name}`,
                        chainRequest: this.createSmStageTransactionRequest({
                            description,
                            eventType: EventType.STAGE,
                            stage: toProcess.into,
                            type: ToProcessType.STAGE
                        })
                    })
                }
            });

        return this;
    }

    createReactions(eventName: string, smListeners: SmListenerDefList<any>): WithMetadataArray<SmEventCallback<ACTIONS>, string> {
        if (smListeners == null || smListeners.length === 0) return [];

        let reactions: WithMetadataArray<SmEventCallback<ACTIONS>, string> = [];
        smListeners.forEach(smListener => {
            let actionListener: SmEventCallback<ACTIONS> = smListener.value[eventName];
            if (!actionListener) return undefined;

            reactions.push({
                value: (actions, params) => {
                    StateMachineLogger.log(this.request.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.REACTION, this.stateMachineTransactions.getCurrentTransactionId(), `(${smListener.metadata})`);
                    actionListener(actions, params)
                },
                metadata: smListener.metadata
            });
        });

        return reactions;

    }

    private createSmStageTransactionRequest(stageToProcess: StageToProcess): SmTransactionRequest {
        let intoStageName = stageToProcess.stage.name;
        let stageDef = this.stageDefsByKey [intoStageName];
        let isDeferredStage: boolean = !!(stageDef && stageDef.deferredInfo);
        let eventName = Strings.camelCaseWithPrefix('on', stageToProcess.stage.name);

        let isOnForkJoiningBack = this.parent && this.parent.joinsInto.indexOf(stageToProcess.stage.name) !== -1;
        let actions = this.createActions(this, this.stageDefsByKey, stageToProcess.stage.name, stageToProcess.stage.requirements);

        if (isDeferredStage) {
            return {
                stateMachine: this,
                target: stageToProcess,
                actions,
                reactionsProducer: () => [{
                    metadata: `([FORK]::${stageToProcess.stage})`,
                    value: () => this.fork(
                        stageToProcess.stage,
                        (actions) => stageDef.deferredInfo.deferrer(actions, stageToProcess.stage.requirements),
                        stageDef.deferredInfo.joinsInto
                    )
                }]
            };
        }

        if (isOnForkJoiningBack) {
            StateMachineLogger.log(this.request.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.FORK_STOP, this.stateMachineTransactions.getCurrentTransactionId(), `=>joining back ${intoStageName}`);
            return {
                stateMachine: this,
                target: stageToProcess,
                actions,
                reactionsProducer: () => [{
                    metadata: `[FORK_END]`, value: () =>
                        this.requestTransition({into: {name: 'stop'}, path: 'doStop'})
                }
                ],
                onDone: ({
                    metadata: `[PARENT FORK JOIN]`, value: (): void => {
                        this.parent.stateMachine.requestTransition({
                            path: 'doForkJoin',
                            into: stageToProcess.stage
                        });
                    }
                })
            };
        }

        return {
            stateMachine: this,
            target: stageToProcess,
            actions,
            onStart: {
                metadata: `[ADDING STAGE TO THREAD EVENT]`,
                value: () => {
                    this.eventThread.addStageEvent(stageToProcess.stage, eventName, stageToProcess.stage.requirements);
                    StateMachineLogger.log(this.request.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.STAGE, this.stateMachineTransactions.getCurrentTransactionId(), `::${stageToProcess.stage.name}`);
                }
            },
            reactionsProducer: () => {
                return this.createReactions(eventName, this.request.stateMachineListeners);
            }
        };
    }

    getEvents(): SerializedSmEvent [] {
        return this.eventThread.serialize();
    }


    getStageDef(name: string): StageDef<any, any, any> {
        return this.stageDefsByKey [name];
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
        StateMachineLogger.log(this.request.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.FORK, this.stateMachineTransactions.getCurrentTransactionId(), `[FORK]::${nextStage.name}`);
        let deferEventName = Strings.camelCaseWithPrefix('on', nextStage.name);
        let deferPathName = Strings.camelCaseWithPrefix('do', nextStage.name);
        return StateMachineFactory.fork({
            stateMachine: this,
            joinsInto
        }, {
            name: `${this.request.name}/${nextStage.name}`,
            stageDefs: [{
                name: nextStage.name,
                logic: this.stageDefsByKey[nextStage.name].logic
            }],
            stateMachineListeners: [
                {
                    metadata: `::${deferEventName}->[DEFERRED],::start=>${deferPathName}`,
                    value: {
                        onStart: (_: any, params: SmEventCallbackParams) => params.sm.requestTransition({
                            path: deferPathName,
                            into: nextStage,
                        }),
                        [deferEventName]: (actions: any) => defer(actions)
                    }
                }
            ],
            stateMachineInterceptors: [],
            syncStateMachineDefs: undefined,
        });
    }

    private createActions(
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


                StateMachineLogger.log(this.request.name, this._status, this.eventThread.getCurrentStageName(), this.eventThread.getCurrentActionName(), EventType.REQUEST, this.stateMachineTransactions.getCurrentTransactionId(), `(proxy::${key})=>requesting::${nextStage.name}`);
                stateMachine.requestTransition({
                    path: key,
                    payload: payload,
                    into: nextStage,
                });
            }
        });
        return proxy;
    }
}
