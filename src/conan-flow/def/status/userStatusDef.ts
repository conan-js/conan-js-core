import {UserReactionsDef} from "../reactionDef";
import {Mutators, VoidMutators} from "../../domain/mutators";
import {StateDataProducer, StatusDataProducer} from "../../domain/flowEvents";
import {IFunction, IPartial} from "../../..";

export type UserFlowStatusesDef<
    STATUSES,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
> = {
    [STATUS in keyof STATUSES & keyof MUTATORS]: UserStatusDef<STATUSES, STATUS, MUTATORS>
};

export interface UserStatusDef<
    STATUSES,
    STATUS extends keyof STATUSES & keyof MUTATORS = any,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
> {
    reactions?: UserReactionsDef<STATUSES, STATUS, MUTATORS>
    transitions?: IFunction<
        StatusDataProducer<STATUSES>,
        IPartial<MUTATORS[STATUS]>
    >,
    steps?: IFunction<
        StateDataProducer<STATUSES, STATUS>,
        IPartial<MUTATORS[STATUS]>
    >

}
