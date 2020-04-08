import {StateMachineCore} from "./stateMachineCore";
import {SmListener} from "../events/stateMachineListeners";
import {ListenersController} from "../events/listenersController";
import {IBiFunction} from "../../conan-utils/typesHelper";
import {TransactionTree} from "../../conan-tx/transactionTree";
import {StateMachineLogger} from "../logging/stateMachineLogger";
import {StateMachineDef} from "../stateMachineDef";

export class StateMachineCoreFactory {
    static create<SM_ON_LISTENER extends SmListener> (
        def: StateMachineDef<SM_ON_LISTENER>,
        Logger$: IBiFunction<StateMachineCore<any>, TransactionTree, StateMachineLogger>
    ): StateMachineCore<SM_ON_LISTENER> {
        return new StateMachineCore<SM_ON_LISTENER>(
            def.rootDef.name,
            new ListenersController<SM_ON_LISTENER>(def.rootDef.listeners, Logger$),
            new ListenersController<SM_ON_LISTENER>(def.rootDef.interceptors, Logger$),
            def.rootDef.stageDefsByKey
        )
    }
}
