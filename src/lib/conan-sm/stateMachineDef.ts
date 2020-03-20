import {SmListener, SmListenerDefList} from "./stateMachineListeners";
import {IKeyValuePairs} from "../conan-utils/typesHelper";
import {StateDef} from "./state";

export interface StateMachineDef<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
>  {
    name: string,
    interceptors: SmListenerDefList<SM_IF_LISTENER>
    listeners: SmListenerDefList<SM_ON_LISTENER>
    stageDefsByKey: IKeyValuePairs<StateDef<any, any, any, any>>,
}
