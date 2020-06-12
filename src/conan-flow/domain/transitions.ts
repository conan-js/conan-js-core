import {Status, StatusLike} from "./status";
import {IFunction, IFunctionVarArg, IKeyValuePairs} from "../..";
import {StatusDataProducer} from "./flowEvents";


export interface Transition {
    transitionName: string;
    payload?: any;
    into: StatusLike;
}

export interface DefaultTransitionFn<
    STATUSES,
> {
    $toStatus<STATUS extends keyof STATUSES>(toStatus: StatusLike<STATUSES, STATUS>): Status<STATUSES, STATUS>;
}

export type DefaultTransitionDefFnPayload<STATUSES, STATUS extends keyof STATUSES> =
    IFunction<StatusDataProducer<STATUSES>, StatusLike<STATUSES, keyof STATUSES>> | StatusLike<STATUSES, keyof STATUSES>
export type TransitionFn<STATUSES> = IFunctionVarArg<StatusLike<STATUSES>>;

export type TransitionsDef<STATUSES> = IFunction<StatusDataProducer<STATUSES>, Transitions<STATUSES>>

export type Transitions<STATUSES> = IKeyValuePairs<TransitionFn<STATUSES>>
