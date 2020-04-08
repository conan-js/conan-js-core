import {SmListener, SmListenerDefList} from "../events/stateMachineListeners";
import {IKeyValuePairs} from "../../conan-utils/typesHelper";
import {StateDef} from "./stateDef";

export interface StateMachineCoreDef<
    SM_ON_LISTENER extends SmListener,
>  {
    name: string,
    interceptors: SmListenerDefList<SM_ON_LISTENER>
    listeners: SmListenerDefList<SM_ON_LISTENER>
    stageDefsByKey: IKeyValuePairs<StateDef<any>>,
}
