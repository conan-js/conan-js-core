import {StateMachineCoreDef} from "./stateMachineCoreDef";
import {StateMachineCore} from "./stateMachineCore";
import {SmListener} from "../stateMachineListeners";
import {ListenersController} from "../listenersController";
import {IBiFunction} from "../../conan-utils/typesHelper";
import {TransactionTree} from "../../conan-tx/transactionTree";
import {StateMachineLogger} from "../stateMachineLogger";

export class StateMachineCoreFactory {
    static create<SM_ON_LISTENER extends SmListener> (
        def: StateMachineCoreDef<SM_ON_LISTENER>,
        Logger$: IBiFunction<StateMachineCore<any>, TransactionTree, StateMachineLogger>
    ): StateMachineCore<SM_ON_LISTENER> {
        return new StateMachineCore<SM_ON_LISTENER>(
            def.name,
            new ListenersController<SM_ON_LISTENER>(def.listeners, Logger$),
            new ListenersController<SM_ON_LISTENER>(def.interceptors, Logger$),
            def.stageDefsByKey
        )
    }
}
