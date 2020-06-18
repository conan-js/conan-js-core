import {Mutators, VoidMutators} from "../domain/mutators";
import {FlowThread} from "./flowThread";
import {FlowDef, ICallback, IConsumer, IKeyValuePairs} from "../..";
import {FlowAnchor} from "./flowAnchor";
import {FlowOrchestrator} from "./flowOrchestrator";
import {Status, StatusLike, StatusLikeParser} from "../domain/status";
import {FlowRuntimeEventSource, FlowRuntimeEventTiming, FlowRuntimeEventType} from "../domain/flowRuntimeEvents";
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

export class FlowImpl<
    STATUSES,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
> implements Flow<STATUSES, MUTATORS> {
    isRunning: boolean = false;
    private flowThread: FlowThread<STATUSES, MUTATORS>;


    constructor(
        private readonly flowDef: FlowDef<STATUSES, MUTATORS>,
        private readonly flowAnchor: FlowAnchor<STATUSES, MUTATORS>,
        private readonly flowOrchestrator: FlowOrchestrator,
    ) {
    }

    start(
        initialStatus?: StatusLike<STATUSES>
    ): this {
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this,
            FlowRuntimeEventSource.FLOW_CONTROLLER,
            FlowRuntimeEventType.START,
            initialStatus
        ).trace(FlowRuntimeEventTiming.REQUEST_START);
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
                    tracker.highlight(FlowRuntimeEventTiming.TRACE, 'initialStatus - resolved', status)
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
                        tracker.highlight(FlowRuntimeEventTiming.TRACE, 'state machine stopped')
                        this.flowThread = null;
                        this.isRunning = false;
                    })
                }
            })
            this.requestStatus($INIT as any);
        }
        AsapParser.from(actualStarter).then(status=> doStart(status));
        tracker.trace(FlowRuntimeEventTiming.REQUEST_END);
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

    onceOn<STATUS extends keyof STATUSES & keyof MUTATORS>(stateName: STATUS, def: ReactionCb<STATUSES, STATUS, MUTATORS>): this {
        return this.addReaction(stateName as any, {
            name: `-`,
            reactionType: ReactionType.ONCE,
            action: def
        })
    }

    addReaction<STATUS extends keyof STATUSES & MUTATORS>(statusName: STATUS, reaction: ReactionDef<STATUSES, STATUS, MUTATORS>): this {
        let needsToBeAdded: boolean = true;
        if (this.isRunning) {
            if (this.flowThread.tryToQueue(statusName as string, reaction)) {
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

        return this;
    }

    private addReactionNext<STATUS extends keyof STATUSES & keyof MUTATORS>(
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
            FlowRuntimeEventSource.FLOW_CONTROLLER,
            FlowRuntimeEventType.PROCESS_REACTIONS,
            statusName
        ).trace(FlowRuntimeEventTiming.REQUEST_START);

        let onAllReactionsCompleted: ICallback
        this.getReactions(statusName).forEach(reaction => {
            if (reaction.reactionType === ReactionType.ONCE) {
                this.removeReaction(statusName, reaction);
            }
            reaction.action(this.flowThread.createContext<STATUS>(statusName, (cb) => onAllReactionsCompleted = cb) as any)
        })

        if (onAllReactionsCompleted) {
            onAllReactionsCompleted();
        }

        tracker.trace(FlowRuntimeEventTiming.REQUEST_END, statusName);
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
        if (!this.isRunning) {
            if (elseIf) elseIf();
            return;
        }

        let currentStatus: string = this.getCurrentStatusName();
        if (currentStatus == null) {
            if (elseIf) {
                elseIf()
            }
            return;
        }

        if (currentStatus === statusName) {
            this.doRun<STATUS>(reaction, statusName);
        } else {
            if (elseIf) {
                elseIf()
            }
        }
    }


    private doRun<STATUS extends keyof STATUSES & keyof MUTATORS>(
        reaction: ReactionDef<STATUSES, STATUS, MUTATORS>,
        currentState: STATUS
    ) {
        reaction.action(this.flowThread.createContext(currentState, (cb) => cb()) as any);
    }

    assertOn<STATUS extends keyof STATUSES>(status: STATUS, then?:IConsumer<Context<STATUSES, STATUS, MUTATORS>>): this {
        let currentStatusName = this.getCurrentStatusName();
        if (currentStatusName !== status) {
            throw new Error(`asserting that we are on the status [${status}]. But we are currently on [${currentStatusName}]`)
        }

        if (then){
            this.onceOn<STATUS>(status, onAssertedStatus=>then(onAssertedStatus))
        }
        return this;
    }

    chainInto<STATUS_FROM extends keyof STATUSES, STATUS_TO extends keyof STATUSES>(
        statusFrom: STATUS_FROM,
        statusTo: STATUS_TO,
        mutatorsCb: IConsumer<MUTATORS[STATUS_FROM]>
    ): Asap<Context<STATUSES, STATUS_TO, MUTATORS>> {
        const [
            next,
            asap
        ] = Asaps.next<Context<STATUSES, STATUS_TO, MUTATORS>>()

        if (this.getCurrentStatusName() !== '$init'){
            this.assertOn(statusFrom);
            this.addReactionNext<STATUS_TO>(this.on<STATUS_TO>(statusTo) as any, {
                name: `once on next`,
                reactionType: ReactionType.ONCE,
                action: onChain => next(onChain)
            });
            this.onceOn(statusFrom, onThisStatus=>mutatorsCb(onThisStatus.do));
        } else {
            let statusToDef: StatusDef<STATUSES, any> = this.getStatusDefs()[statusTo as string];
            this.onceOn(`$init` as any, ()=>mutatorsCb(statusToDef.steps as any));
        }
        return asap;
    }

    deferInto<STATUS_FROM extends keyof STATUSES, STATUS_TO extends keyof STATUSES>(
        statusFrom: STATUS_FROM,
        statusTo: STATUS_TO,
        mutatorsCbAsapLike: DeferLike<MUTATORS[STATUS_FROM]>
    ): Asap<Context<STATUSES, STATUS_TO, MUTATORS>> {
        let mutatorsCbAsap: Defer<MUTATORS[STATUS_FROM]> = deferParser(mutatorsCbAsapLike, {
            name: `[${this.getName()}]::${statusFrom}=>${statusTo}`,
            payload: `[${this.getName()}]::${statusFrom}=>${statusTo}`
        });
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this,
            FlowRuntimeEventSource.FLOW_CONTROLLER,
            FlowRuntimeEventType.MONITOR,
            {
                asap: mutatorsCbAsap.action,
                name: mutatorsCbAsap.name,
                payload: mutatorsCbAsap.payload
            } as AsynAction<any>
        ).trace(FlowRuntimeEventTiming.REQUEST_START);

        return mutatorsCbAsap.action.merge(cb => {
            tracker.trace(FlowRuntimeEventTiming.REQUEST_END);
            return this.chainInto(statusFrom, statusTo, cb);
        }).onCancel(()=>{
            tracker.trace(FlowRuntimeEventTiming.REQUEST_CANCEL);
        });
    }
}
