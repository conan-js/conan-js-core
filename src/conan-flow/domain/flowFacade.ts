import {Flow} from "./flow";
import {Mutators, VoidMutators} from "./mutators";
import {ReactionCb, ReactionDef} from "../def/reactionDef";
import {IConsumer} from "../..";
import {FlowEventsTracker} from "../logic/flowEventsTracker";
import {StatusDef} from "../def/status/statusDef";
import {Status, StatusLike} from "./status";
import {Context} from "./context";
import {Asap} from "../../conan-utils/asap";
import {DeferLike} from "./defer";
import {FlowEventNature} from "./flowRuntimeEvents";

export interface FlowFacade<
    STATUSES,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
    ACTIONS = void
> extends Flow<STATUSES, MUTATORS> {
    do: ACTIONS;
}

export class FlowFacadeImpl<STATUSES, MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>, ACTIONS = void> implements FlowFacade<STATUSES, MUTATORS, ACTIONS> {
    constructor(
        private readonly flow: Flow<STATUSES, MUTATORS>,
        readonly actions: ACTIONS
    ) {
        this.do = actions;
    }

    do: ACTIONS;

    addReaction<STATUS extends keyof STATUSES & MUTATORS>(statusName: STATUS, reaction: ReactionDef<STATUSES, STATUS, MUTATORS>): this {
        this.flow.addReaction(statusName, reaction);
        return this;
    }

    alwaysOn<STATUS extends keyof STATUSES & keyof MUTATORS>(stateName: STATUS, def: ReactionCb<STATUSES, STATUS, MUTATORS>): this {
        this.flow.alwaysOn(stateName, def);
        return this;
    }

    assertOn<STATUS extends keyof STATUSES>(status: STATUS, then?:IConsumer<Context<STATUSES, STATUS, MUTATORS>>): this {
        this.flow.assertOn(status, then);
        return this;
    }

    chainInto<STATUS_FROM extends keyof STATUSES, STATUS_TO extends keyof STATUSES>(statusFrom: STATUS_FROM, statusTo: STATUS_TO, mutatorsCb: IConsumer<MUTATORS[STATUS_FROM]>): Asap<Context<STATUSES, STATUS_TO, MUTATORS>> {
        this.flow.chainInto(statusFrom, statusTo, mutatorsCb);
        return undefined;
    }

    getCurrentStatusName(): string {
        return this.flow.getCurrentStatusName();
    }

    getEvents(): FlowEventsTracker<STATUSES> {
        return this.flow.getEvents();
    }

    getName(): string {
        return this.flow.getName();
    }

    getState(): any {
        return this.flow.getState();
    }

    getStatusData(): { [STATUS in keyof STATUSES]?: STATUSES[STATUS] } {
        return this.flow.getStatusData();
    }

    on<STATUS extends keyof STATUSES>(statusName: STATUS): StatusDef<STATUSES, STATUS> {
        return this.flow.on(statusName);
    }

    onceOn<STATUS extends keyof STATUSES & keyof MUTATORS>(stateName: STATUS, def: ReactionCb<STATUSES, STATUS, MUTATORS>): this {
        this.flow.onceOn(stateName, def);
        return this;
    }

    onceOnInit(def: ReactionCb<STATUSES, any, MUTATORS>): this {
        this.flow.onceOnInit(def);
        return this;
    }

    onceOnStop(def: ReactionCb<STATUSES, any, MUTATORS>): this {
        this.flow.onceOnStop(def);
        return this;
    }

    start(initialStatus?: StatusLike<STATUSES>): this {
        this.flow.start(initialStatus);
        return this;
    }

    stop(eventsCb?: IConsumer<FlowEventsTracker<STATUSES>>): this {
        this.flow.stop(eventsCb);
        return this;
    }

    get isRunning (): boolean{
        return this.flow.isRunning;
    }

    onInit(): StatusDef<STATUSES, any> {
        return this.flow.onInit();
    }

    reactOnStatusChanged(customReaction: IConsumer<Status<STATUSES>>): this {
        this.flow.reactOnStatusChanged(customReaction);
        return this;
    }

    deferInto<STATUS_FROM extends keyof STATUSES, STATUS_TO extends keyof STATUSES>(statusFrom: STATUS_FROM, statusTo: STATUS_TO, mutatorsCbAsap: DeferLike<MUTATORS[STATUS_FROM]>): Asap<Context<STATUSES, STATUS_TO, MUTATORS>> {
        return this.flow.deferInto(statusFrom, statusTo, mutatorsCbAsap);
    }

    removeReaction<STATUS extends keyof STATUSES & keyof MUTATORS>(statusName: STATUS, reactionToRemove: ReactionDef<STATUSES, STATUS, MUTATORS>): void {
        this.flow.removeReaction(statusName, reactionToRemove);
    }

    changeLoggingNature(nature: FlowEventNature) {
        this.flow.changeLoggingNature(nature);
    }
}
