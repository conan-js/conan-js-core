import {FlowDef, IConsumer} from "../../index";
import {StatusDef} from "../def/status/statusDef";
import {ReactionCb, ReactionDef} from "../def/reactionDef";
import {Status, StatusLike} from "./status";
import {Mutators, VoidMutators} from "./mutators";
import {FlowEventsTracker} from "../logic/flowEventsTracker";
import {Context} from "./context";
import {Asap} from "../../conan-utils/asap";
import {DeferLike} from "./defer";
import {FlowEventNature, FlowEventType} from "./flowRuntimeEvents";
import {FlowRuntimeTracker} from "../logic/flowRuntimeTracker";
import {ThreadFacade} from "../../conan-thread/domain/threadFacade";

export const $INIT = "$init";
export const $STOP = "$stop";


export interface BaseStates {
    $init: void,
    $stop: void,
}

export interface Flow<
    STATUSES,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>
> {
    isRunning: boolean;

    start(initialStatus?: StatusLike<STATUSES>): this;

    stop(eventsCb?: IConsumer<FlowEventsTracker<STATUSES>>): this;

    alwaysOn<STATUS extends keyof STATUSES & keyof MUTATORS>(stateName: STATUS, def: ReactionCb<STATUSES, STATUS, MUTATORS>): this;

    onceOnInit(def: ReactionCb<STATUSES, any, MUTATORS>): this;

    onceOnStop(def: ReactionCb<STATUSES, any, MUTATORS>): this;

    onceOn<STATUS extends keyof STATUSES & keyof MUTATORS>(statusName: STATUS, def: ReactionCb<STATUSES, STATUS, MUTATORS>, name?: string): this;

    addReaction<STATUS extends keyof STATUSES & MUTATORS>(statusName: STATUS, reaction: ReactionDef<STATUSES, STATUS, MUTATORS>): this;

    addReactionNext<STATUS extends keyof STATUSES & keyof MUTATORS>(
        statusDef: StatusDef<STATUSES, STATUS, MUTATORS>,
        reaction: ReactionDef<STATUSES, STATUS, MUTATORS>
    ): this

    removeReaction<STATUS extends keyof STATUSES & keyof MUTATORS, >(statusName: STATUS, reactionToRemove: ReactionDef<STATUSES, STATUS, MUTATORS>): void;

    getCurrentStatusName(): string;

    getEvents(): FlowEventsTracker<STATUSES>;

    getName(): string;

    getState(): any;

    getStatusData(): { [STATUS in keyof STATUSES]?: STATUSES[STATUS] };

    on<STATUS extends keyof STATUSES>(statusName: STATUS): StatusDef<STATUSES, STATUS>;

    onInit(): StatusDef<STATUSES, any>;

    assertOn<STATUS extends keyof STATUSES>(status: STATUS, then?:IConsumer<Context<STATUSES, STATUS, MUTATORS>>): this;

    chainInto<STATUS_FROM extends keyof STATUSES, STATUS_TO extends keyof STATUSES>(
        statusFrom: STATUS_FROM,
        statusTo: STATUS_TO,
        mutatorsCb: IConsumer<MUTATORS[STATUS_FROM]>,
        name?: string
    ): Asap<Context<STATUSES, STATUS_TO, MUTATORS>>;

    deferInto<STATUS_FROM extends keyof STATUSES, STATUS_TO extends keyof STATUSES>(
        statusFrom: STATUS_FROM,
        statusTo: STATUS_TO,
        mutatorsCbAsap: DeferLike<MUTATORS[STATUS_FROM]>
    ): Asap<Context<STATUSES, STATUS_TO, MUTATORS>>;

    reactOnStatusChanged(customReaction: IConsumer<Status<STATUSES>>): this;

    changeLoggingNature(nature: FlowEventNature): void;

    log(msg: string);

    createRuntimeTracker(runtimeEvent: FlowEventType, payload?: any): FlowRuntimeTracker;

    getDefinition (): FlowDef<STATUSES, MUTATORS>;

    toState<STATUS extends keyof STATUSES> (statusName: STATUS): ThreadFacade<STATUSES[STATUS]>;

    toStateAll(): ThreadFacade <Status>;
}
