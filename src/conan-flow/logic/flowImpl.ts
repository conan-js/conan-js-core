import {Mutators, VoidMutators} from "../domain/mutators";
import {FlowThread} from "./flowThread";
import {AsapType, Conan, ConanState, FlowDef, ICallback, IConsumer, IKeyValuePairs} from "../../index";
import {FlowAnchor} from "./flowAnchor";
import {FlowOrchestrator} from "./flowOrchestrator";
import {Status, StatusLike, StatusLikeParser} from "../domain/status";
import {FlowEventNature, FlowEventSource, FlowEventType} from "../domain/flowRuntimeEvents";
import {ReactionType} from "../domain/reactions";
import {Asap, AsapParser, Asaps} from "../../conan-utils/asap";
import {Transition} from "../domain/transitions";
import {ReactionCb, ReactionDef} from "../def/reactionDef";
import {StatusDef} from "../def/status/statusDef";
import {$INIT, $STOP, Flow} from "../domain/flow";
import {FlowEventsTracker} from "./flowEventsTracker";
import {Context} from "../domain/context";
import {Defer, DeferLike, deferParser} from "../domain/defer";
import {AsynAction} from "../../conan-monitor/domain/asynAction";
import {FlowRuntimeTracker} from "./flowRuntimeTracker";
import {Threads} from "../../conan-thread/factories/threads";
import {ThreadFacade} from "../../conan-thread/domain/threadFacade";

export class FlowImpl<STATUSES,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
    > implements Flow<STATUSES, MUTATORS> {
    isRunning: boolean = false;
    private flowThread: FlowThread<STATUSES, MUTATORS>;


    constructor(
        readonly flowDef: FlowDef<STATUSES, MUTATORS>,
        private readonly flowAnchor: FlowAnchor<STATUSES, MUTATORS>,
        private readonly flowOrchestrator: FlowOrchestrator,
    ) {
    }

    start(
        initialStatus?: StatusLike<STATUSES>
    ): this {
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this,
            FlowEventSource.FLOW_CONTROLLER,
            FlowEventType.STARTING,
            initialStatus
        ).start();
        if (this.isRunning) {
            throw new Error(`can't request a flow that it has been started to start again`);
        }
        this.flowThread = this.flowAnchor.createNewThread(this, this.flowOrchestrator);
        this.isRunning = true;
        if (initialStatus == null && this.flowDef.starter == null) {
            this.requestStatus($INIT as any);
            return this;
        }

        let actualStarter = initialStatus ? initialStatus : this.flowDef.starter();
        let doStart = (status: StatusLike<STATUSES>) => {
            this.addReaction($INIT as any, {
                action: () => {
                    tracker.debug('initialStatus', status)
                    this.requestStatus(status);
                },
                reactionType: ReactionType.ONCE,
                name: 'to initial state'
            })
            this.addReaction($STOP as any, {
                name: `onStop=>notifyEvents`,
                reactionType: ReactionType.ONCE,
                action: onStop => {
                    onStop.chain(() => {
                        tracker.debug('state machine stopped')
                        this.flowThread = null;
                        this.isRunning = false;
                    })
                }
            })
            this.requestStatus($INIT as any);
        }
        AsapParser.from(actualStarter).then(status => doStart(status));
        tracker.end();
        return this;
    }

    requestStatus(statusLike: StatusLike<STATUSES>): void {
        let statusName = StatusLikeParser.parse<STATUSES>(statusLike).name;

        if (!this.isRunning) return;
        if (this.on(statusName) == null) {
            throw new Error(`unable to request non existing status [${statusName}]`);
        }
        this.flowThread.requestStatus(statusLike, false);
    }

    requestState(statusName: string, data: any): void {
        if (!this.isRunning) return;
        this.flowThread.requestState(statusName, data);
    }

    requestTransition(transition: Transition): this {
        if (!this.isRunning) return;
        this.flowThread.requestTransition(transition, false);
        return this;
    }

    requestStep(statusName: string, reducerName: string, payload: any, data: any): void {
        if (!this.isRunning) return;
        this.flowThread.requestStep(statusName, reducerName, payload, data);
    }

    stop(eventsCb?: IConsumer<FlowEventsTracker<STATUSES>>): this {
        if (!this.isRunning) {
            throw new Error(`unexpected`);
        }
        this.addReaction($STOP as any, {
            name: `onStop=>notifyEvents`,
            reactionType: ReactionType.ONCE,
            action: () => {
                if (eventsCb) {
                    eventsCb(this.flowAnchor.getCurrentEvents());
                }
            }
        })
        this.requestStatus({
            name: $STOP
        });
        return this;
    }

    alwaysOn<STATUS extends keyof STATUSES & keyof MUTATORS>(stateName: STATUS, def: ReactionCb<STATUSES, STATUS, MUTATORS>): this {
        return this.addReaction(stateName as any, {
            name: `-`,
            reactionType: ReactionType.ALWAYS,
            action: def
        })
    }

    onceOnInit(def: ReactionCb<STATUSES, any, MUTATORS>): this {
        return this.onceOn($INIT as any, def);
    }

    onceOnStop(def: ReactionCb<STATUSES, any, MUTATORS>): this {
        return this.onceOn($STOP as any, def);
    }

    onceOn<STATUS extends keyof STATUSES & keyof MUTATORS>(stateName: STATUS, def: ReactionCb<STATUSES, STATUS, MUTATORS>, name?: string): this {
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this,
            FlowEventSource.FLOW_CONTROLLER,
            FlowEventType.ONCE_ON,
            stateName
        ).start();

        tracker.debug(`[onceOn(${stateName})`);
        let flow = this.addReaction(stateName as any, {
            name: name != null ? name: `[userCode]`,
            reactionType: ReactionType.ONCE,
            action: def
        });

        tracker.end();
        return flow
    }

    addReaction<STATUS extends keyof STATUSES & MUTATORS>(statusName: STATUS, reaction: ReactionDef<STATUSES, STATUS, MUTATORS>): this {
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this,
            FlowEventSource.FLOW_CONTROLLER,
            FlowEventType.ADDING_REACTION,
        ).start();

        let needsToBeAdded: boolean = true;
        if (this.isRunning) {
            if (this.flowThread.tryToQueue(statusName as string, reaction)) {
                tracker.info([`queueing reaction: ${reaction.name}`])
                tracker.end();
                return this;
            }

            this.runIf<STATUS>(
                statusName,
                {
                    action: (context) => {
                        reaction.action(context as any);
                        if (reaction.reactionType === ReactionType.ONCE) {
                            needsToBeAdded = false;
                        }
                    },
                    reactionType: reaction.reactionType,
                    name: reaction.name
                }
            )
        }
        if (needsToBeAdded) {
            let statusDef = this.on(statusName);
            if (statusDef == null) {
                throw new Error(`unable to add reactions for unknown event [${statusName}]`);
            }
            this.addReactionNext<STATUS>(statusDef as any, reaction);
        }

        tracker.end();
        return this;
    }

    public addReactionNext<STATUS extends keyof STATUSES & keyof MUTATORS>(
        statusDef: StatusDef<STATUSES, STATUS, MUTATORS>,
        reaction: ReactionDef<STATUSES, STATUS, MUTATORS>
    ): this {
        statusDef.reactions.push(reaction);
        return this;
    }

    public getReactions<STATUS extends keyof STATUSES & keyof MUTATORS,
        >(statusName: STATUS): ReactionDef<STATUSES, STATUS, MUTATORS> [] {
        let statusDef = this.on(statusName);
        if (statusDef == null) {
            throw new Error(`can't getReactions for unknown status[${statusName}]`)
        }
        return statusDef.reactions as any;

    }

    getCurrentStatusName(): string {
        if (this.flowThread == undefined) return undefined;
        return this.flowThread.getCurrentStatusName();
    }

    getEvents(): FlowEventsTracker<STATUSES> {
        return this.flowAnchor.getCurrentEvents();
    }

    getName(): string {
        return this.flowDef.name;
    }

    getState(): any {
        return this.flowThread.getCurrentState();
    }

    getStatusData(): { [STATUS in keyof STATUSES]?: STATUSES[STATUS] } {
        return this.flowAnchor.getStatusData();
    }


    onInit(): StatusDef<STATUSES, any> {
        return this.on($INIT as any);
    }

    on<STATUS extends keyof STATUSES>(statusName: STATUS): StatusDef<STATUSES, STATUS> {
        return this.flowDef.statusesByStatusName [statusName] as any;
    }

    getStatusDefs(): IKeyValuePairs<StatusDef<STATUSES, any>> {
        return this.flowDef.statusesByStatusName as any;
    }

    removeReaction<STATUS extends keyof STATUSES & keyof MUTATORS, >(statusName: STATUS, reactionToRemove: ReactionDef<STATUSES, STATUS, MUTATORS>): void {
        let statusDef = this.on(statusName);

        let previousReactions = statusDef.reactions;
        if (!previousReactions) return;
        statusDef.reactions = previousReactions.filter(it => it !== reactionToRemove);
    }

    public processReactions<STATUS extends keyof STATUSES & keyof MUTATORS,
        >(
        statusName: STATUS,
    ) {
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this,
            FlowEventSource.FLOW_CONTROLLER,
            FlowEventType.PROCESSING_REACTIONS,
        ).start();

        let reactions = this.getReactions(statusName);
        let reactionNames = reactions.map(it=>it.name).join(',');
        tracker.info(`ABOUT TO PROCESS: ${reactionNames}`)

        let onAllReactionsCompleted: ICallback
        reactions.forEach(reaction => {
            tracker.info(`START: ${reaction.name}`)
            if (reaction.reactionType === ReactionType.ONCE) {
                this.removeReaction(statusName, reaction);
            }
            reaction.action(this.flowThread.createContext<STATUS>(statusName, (cb) => onAllReactionsCompleted = cb) as any)
            tracker.info(`END:  ${reaction.name}`)
        })

        tracker.info(`REACTIONS PROCESSED${reactionNames}`)

        if (onAllReactionsCompleted) {
            onAllReactionsCompleted();
        }

        tracker.end(statusName);
        return this;
    }

    public getStateData(): any {
        throw new Error(`TBI`);
    }

    public reactOnStatusChanged(customReaction: IConsumer<Status<STATUSES>>): this {
        Object.keys(this.getStatusDefs()).forEach(stateName => {
            this.addReaction(stateName as any, {
                name: `-`,
                reactionType: ReactionType.ALWAYS,
                action: context => customReaction({name: stateName as any, data: context.getData()})
            });
        });
        return this;
    }

    runIf<STATUS extends keyof STATUSES & keyof MUTATORS>(statusName: STATUS, reaction: ReactionDef<STATUSES, STATUS, MUTATORS>, elseIf?: ICallback): void {
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this,
            FlowEventSource.FLOW_CONTROLLER,
            FlowEventType.RUN_IF,
            reaction.name
        ).start();

        if (!this.isRunning) {
            if (elseIf) elseIf();
            tracker.end();
            return;
        }

        let currentStatus: string = this.getCurrentStatusName();
        if (currentStatus == null) {
            if (elseIf) {
                elseIf()
            }
            tracker.end();
            return;
        }

        if (currentStatus === statusName) {
            this.doRun<STATUS>(reaction, statusName);
        } else {
            if (elseIf) {
                elseIf()
            }
        }
        tracker.end();
    }


    private doRun<STATUS extends keyof STATUSES & keyof MUTATORS>(
        reaction: ReactionDef<STATUSES, STATUS, MUTATORS>,
        currentState: STATUS
    ) {
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this,
            FlowEventSource.FLOW_CONTROLLER,
            FlowEventType.RUN,
            reaction.name
        ).start();

        tracker.debug(`${reaction.name}`);
        reaction.action(this.flowThread.createContext(currentState, (cb) => cb()) as any);

        tracker.end();
    }

    assertOn<STATUS extends keyof STATUSES>(status: STATUS, then?: IConsumer<Context<STATUSES, STATUS, MUTATORS>>): this {
        let currentStatusName = this.getCurrentStatusName();
        if (currentStatusName !== status) {
            throw new Error(`asserting that we are on the status [${status}]. But we are currently on [${currentStatusName}]`)
        }

        if (then) {
            this.onceOn<STATUS>(status, onAssertedStatus => then(onAssertedStatus))
        }
        return this;
    }

    chainInto<STATUS_FROM extends keyof STATUSES, STATUS_TO extends keyof STATUSES>(
        statusFrom: STATUS_FROM,
        statusTo: STATUS_TO,
        mutatorsCb: IConsumer<MUTATORS[STATUS_FROM]>,
        name?: string
    ): Asap<Context<STATUSES, STATUS_TO, MUTATORS>> {
        let chainName = name != null ? name : `chainInto-${this.getName()}:${statusTo}`;
        const [
            next,
            asap
        ] = Asaps.next<Context<STATUSES, STATUS_TO, MUTATORS>>(chainName, FlowEventNature.AUX);


        this.addReactionNext<STATUS_TO>(this.on<STATUS_TO>(statusTo) as any, {
            name: chainName,
            reactionType: ReactionType.ONCE,
            action: onChain => next(onChain)
        });

        if (this.getCurrentStatusName() !== '$init'){
            this.assertOn(statusFrom);
            this.onceOn(statusFrom, onThisStatus => mutatorsCb(onThisStatus.do), 'chain-' + chainName);
        } else {
            let statusToDef: StatusDef<STATUSES, any> = this.getStatusDefs()[statusTo as string];
            this.onceOn(`$init` as any, () => mutatorsCb(statusToDef.steps as any), 'chain-' + chainName);
        }
        return asap;
    }

    deferInto<STATUS_FROM extends keyof STATUSES, STATUS_TO extends keyof STATUSES>(
        statusFrom: STATUS_FROM,
        statusTo: STATUS_TO,
        mutatorsCbAsapLike: DeferLike<MUTATORS[STATUS_FROM]>
    ): Asap<Context<STATUSES, STATUS_TO, MUTATORS>> {
        let description = `[${this.getName()}]::${statusFrom}=>${statusTo}`;
        let defer: Defer<MUTATORS[STATUS_FROM]> = deferParser(mutatorsCbAsapLike, {
            name: description,
            payload: description
        });
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this,
            FlowEventSource.FLOW_CONTROLLER,
            FlowEventType.MONITORING,
            {
                asap: defer.action,
                name: defer.name,
                payload: defer.payload
            } as AsynAction<any>
        ).start();

        if (defer.action.type === AsapType.LATER) {
            tracker.milestone(`START monitoring - ${defer.name}`, defer.payload)
        }

        return defer.action.chain(cb => {
            if (defer.action.type === AsapType.LATER) {
                tracker.debug(`STOP monitoring - ${defer.name}`)
            }
            tracker.end();
            return this.chainInto(statusFrom, statusTo, cb);
        }).onCancel(() => {
            tracker.cancel();
        });
    }

    changeLoggingNature(nature: FlowEventNature) {
        this.flowDef.nature = nature;
    }

    log(msg: string) {
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this,
            FlowEventSource.USER_MSG,
            FlowEventType.USER_CODE,
            msg
        ).start();

        let flowRuntimeTracker = tracker.milestone( undefined, msg);
        tracker.end();
        return flowRuntimeTracker;
    }

    createRuntimeTracker(runtimeEvent: FlowEventType, payload?: any): FlowRuntimeTracker {
        return this.flowOrchestrator.createRuntimeTracker(
            this,
            FlowEventSource.FLOW_CONTROLLER,
            runtimeEvent,
            payload
        )
    }

    getDefinition(): FlowDef<STATUSES, MUTATORS> {
        return this.flowDef;
    }

    toStateAll(): ThreadFacade <Status>{
        let thread = Threads.create<Status>({
            name: `${this.getName()}=>[all statuses]`
        });

        this.reactOnStatusChanged(status=>thread.do.$update(status));

        return thread;
    }

    toState<STATUS extends keyof STATUSES> (statusName: STATUS): ThreadFacade<STATUSES[STATUS]> {
        let thread = Threads.create<STATUSES[STATUS]>({name:`${this.getName()}=>[states:${statusName}]`});

        this.alwaysOn(statusName, (state)=>thread.do.$update(state.getData()));

        return thread;
    }
}
