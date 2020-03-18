import {SmListener} from "./stateMachineListeners";
import {IConsumer, IOptSetKeyValuePairs} from "../conan-utils/typesHelper";
import {StateMachineTreeDefBuilder} from "./stateMachineTreeDefBuilder";
import {StateMachineDef} from "./stateMachineDef";

export type SyncListener<
    INTO_SM_ON_LISTENER extends SmListener,
    JOIN_SM_ON_LISTENER extends SmListener
> = IOptSetKeyValuePairs<keyof INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>

export interface SyncStateMachineDef<
    SM_IF_LISTENER extends SmListener,
    INTO_SM_ON_LISTENER extends SmListener,
    JOIN_SM_ON_LISTENER extends SmListener,
> {
    childTree: StateMachineTreeDefBuilder <SM_IF_LISTENER>,
    syncName: string,
    syncStartingPath?: string;
    joiner: SyncListener<INTO_SM_ON_LISTENER, SM_IF_LISTENER>,
    initCb?: IConsumer<StateMachineTreeDef<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>>
}

export interface StateMachineTreeDef<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
> {
    rootDef: StateMachineDef<SM_ON_LISTENER, SM_IF_LISTENER>;
    syncDefs: SyncStateMachineDef<SM_IF_LISTENER, any, any> [],
}
