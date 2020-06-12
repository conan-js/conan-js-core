import {IConsumer} from "../..";
import {ReactionType} from "../domain/reactions";
import {Context} from "../domain/context";
import {Mutators, VoidMutators} from "../domain/mutators";

export type UserReactionsDef <
    STATUSES,
    STATUS extends keyof STATUSES & keyof MUTATORS,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
> = ReactionDefLike<STATUSES, STATUS, MUTATORS>[];

export type ReactionDefLike <
    STATUSES,
    STATUS extends keyof STATUSES & keyof MUTATORS,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
> = ReactionCb<STATUSES, STATUS, MUTATORS> | ReactionDef<STATUSES, STATUS, MUTATORS>

export type ReactionCb<
    STATUSES,
    STATUS extends keyof STATUSES & keyof MUTATORS,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
> = IConsumer<Context<STATUSES, STATUS, MUTATORS>>;

export interface ReactionDef<
    STATUSES,
    STATUS extends keyof STATUSES & keyof MUTATORS,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
> {
    action: ReactionCb<STATUSES, STATUS, MUTATORS>,
    name: string,
    reactionType: ReactionType
}


export class ReactionDefLikeParser {
    static parse<
        STATUSES,
        STATUS extends keyof STATUSES,
        MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
    > (
        toParse: ReactionDefLike<STATUSES, STATUS, MUTATORS>,
        reactionType: ReactionType,
        defaultName?: string,
    ): ReactionDef<STATUSES, STATUS, MUTATORS>{
        if (typeof toParse === "object") return toParse;

        return {
            name: defaultName ? defaultName : 'anonymous',
            reactionType: reactionType,
            action: toParse
        }
    }
}
