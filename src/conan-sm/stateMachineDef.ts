import {SmListener} from "./events/stateMachineListeners";
import {IConsumer, IFunction, IOptSetKeyValuePairs} from "../conan-utils/typesHelper";
import {StateMachineCoreDef} from "./core/stateMachineCoreDef";
import {StateMachineDefBuilder} from "./core/stateMachineDefBuilder";
import {AsapLike} from "../conan-utils/asap";
import {State} from "./core/state";

export type SyncListener<
    INTO_SM_ON_LISTENER extends SmListener,
    JOIN_SM_ON_LISTENER extends SmListener
> = IOptSetKeyValuePairs<keyof INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>

export interface SyncStateMachineDef<
    SM_IF_LISTENER extends SmListener,
    INTO_SM_ON_LISTENER extends SmListener,
> {
    childTree: StateMachineDefBuilder <SM_IF_LISTENER>,
    syncName: string,
    syncStartingPath?: string;
    joiner: SyncListener<INTO_SM_ON_LISTENER, SM_IF_LISTENER>,
    initCb?: IConsumer<StateMachineDef<INTO_SM_ON_LISTENER>>
}

export interface StateMachineDef<
    SM_ON_LISTENER extends SmListener,
    STARTER = AsapLike<State<any>>
> {
    rootDef: StateMachineCoreDef<SM_ON_LISTENER>;
    mapper?: IFunction<STARTER, AsapLike<State<any>>>
}
