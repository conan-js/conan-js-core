import {IFunction, IFunctionVarArg, IKeyValuePairs, IProducer} from "../..";


export type StepsFn<STATUSES, STATUS extends keyof STATUSES> = IFunctionVarArg<STATUSES[STATUS]>;

export type StepsDef<STATUSES, STATUS extends keyof STATUSES> = IFunction<
    IProducer<STATUSES[STATUS]>,
    Steps<STATUSES, STATUS>
>

export type Steps<STATUSES, STATUS extends keyof STATUSES> = IKeyValuePairs<StepsFn<STATUSES, STATUS>>
