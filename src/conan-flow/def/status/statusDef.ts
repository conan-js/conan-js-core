import {ReactionDef} from "../reactionDef";
import {Transitions} from "../../domain/transitions";
import {Steps} from "../stepsDef";
import {Mutators, VoidMutators} from "../../domain/mutators";


export type StatusesDef<STATUSES> = {[STATUS in keyof STATUSES]: StatusDef <STATUSES, STATUS>};

export interface StatusDef<
    STATUSES,
    STATUS extends keyof STATUSES,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
> {
    name: string,
    steps: Steps<STATUSES, STATUS>;
    transitions: Transitions<STATUSES>;
    reactions: ReactionDef<STATUSES, STATUS, MUTATORS> []
    getLastData(): STATUSES[STATUS];
}
