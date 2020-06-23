import {ICallback, IProducer} from "../..";
import {DefaultTransitionFn} from "./transitions";
import {DefaultStepFn} from "./steps";
import {Mutators, VoidMutators} from "./mutators";
import {FlowRuntimeTracker} from "../logic/flowRuntimeTracker";

export interface Context<
    STATUSES,
    STATUS extends keyof STATUSES & keyof MUTATORS,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
> {
    getStatusData:<STATUS extends keyof STATUSES> (statusName: STATUS, defaultValue: STATUSES[STATUS])=> STATUSES[STATUS],
    getData: IProducer<STATUSES[STATUS]>,
    do: MUTATORS[STATUS] & DefaultTransitionFn<STATUSES> & DefaultStepFn<STATUSES[STATUS]>
    chain(cb :ICallback): void;
    interruptFlow(): void;
    log(msg: string): void;
}
