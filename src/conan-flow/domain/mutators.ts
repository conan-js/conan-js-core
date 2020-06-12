import {IFunctionVarArg, IKeyValuePairs} from "../..";
import {StatusLike} from "./status";
export type VoidMutators<STATUSES> = {[STATUS in keyof STATUSES]: void};

export type MutatorReturnValue<STATUSES, STATUS extends keyof STATUSES> = StatusLike<STATUSES> | STATUSES[STATUS] | void;
export type Mutator<STATUSES, STATUS extends keyof STATUSES> = (IKeyValuePairs<IFunctionVarArg<MutatorReturnValue<STATUSES, STATUS>>>)
export type Mutators<STATUSES> = {[STATUS in keyof STATUSES]: Mutator<STATUSES, STATUS> | void};
