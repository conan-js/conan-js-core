import { SmListener } from "./events/stateMachineListeners";
import { StateMachineDef, SyncStateMachineDef } from "./stateMachineDef";
import { StateMachine, StateMachineType } from "./stateMachine";
import { TransactionTree } from "../conan-tx/transactionTree";
import { ForkStateMachineListener } from "./prototypes/forkStateMachine";
import { StateMachineFacade } from "../stateMachineFacade";
import { AsapLike } from "../conan-utils/asap";
import { State } from "./core/state";
export interface Synchronisation {
    syncDef: SyncStateMachineDef<any, any>;
    tree: StartSmTree;
}
export interface StartSmTree {
    stateMachineTreeDef: StateMachineDef<any>;
    downSyncs: Synchronisation[];
}
export declare class StateMachineFactory {
    static create<SM_ON_LISTENER extends SmListener, STARTER = AsapLike<State<any>>>(stateMachineDef: StateMachineDef<SM_ON_LISTENER, STARTER>, smForkOpt?: StateMachine<ForkStateMachineListener>): StateMachineFacade<SM_ON_LISTENER, STARTER>;
    static createSimpleSm<SM_ON_LISTENER extends SmListener>(def: StateMachineDef<SM_ON_LISTENER>, type: StateMachineType, treeToUse?: TransactionTree): StateMachine<SM_ON_LISTENER>;
    private static createForkableSm;
    private static createForkSm;
    private static createSm;
}
