import { StateMachineCore } from "./stateMachineCore";
import { SmListener } from "../events/stateMachineListeners";
import { IBiFunction } from "../../conan-utils/typesHelper";
import { TransactionTree } from "../../conan-tx/transactionTree";
import { StateMachineLogger } from "../logging/stateMachineLogger";
import { StateMachineDef } from "../stateMachineDef";
export declare class StateMachineCoreFactory {
    static create<SM_ON_LISTENER extends SmListener>(def: StateMachineDef<SM_ON_LISTENER>, Logger$: IBiFunction<StateMachineCore<any>, TransactionTree, StateMachineLogger>): StateMachineCore<SM_ON_LISTENER>;
}
