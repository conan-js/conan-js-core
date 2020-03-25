import {SmListener} from "./stateMachineListeners";
import {IConsumer, IOptSetKeyValuePairs} from "../conan-utils/typesHelper";
import {StateMachineCoreDef} from "./core/stateMachineCoreDef";
import {StateMachineCoreDefBuilder} from "./core/stateMachineCoreDefBuilder";

export type SyncListener<
    INTO_SM_ON_LISTENER extends SmListener,
    JOIN_SM_ON_LISTENER extends SmListener
> = IOptSetKeyValuePairs<keyof INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>

export interface SyncStateMachineDef<
    SM_IF_LISTENER extends SmListener,
    INTO_SM_ON_LISTENER extends SmListener,
    JOIN_SM_ON_LISTENER extends SmListener,
> {
    childTree: StateMachineCoreDefBuilder <SM_IF_LISTENER>,
    syncName: string,
    syncStartingPath?: string;
    joiner: SyncListener<INTO_SM_ON_LISTENER, SM_IF_LISTENER>,
    initCb?: IConsumer<StateMachineDef<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>>
}

export interface StateMachineDef<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
> {
    rootDef: StateMachineCoreDef<SM_ON_LISTENER>;
    syncDefs: SyncStateMachineDef<SM_IF_LISTENER, any, any> [],
}
