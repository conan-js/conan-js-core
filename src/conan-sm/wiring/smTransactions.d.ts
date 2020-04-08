import { TransactionRequest } from "../../conan-tx/transaction";
import { SmOrchestrator } from "./smOrchestrator";
import { State } from "../core/state";
import { IConsumer } from "../../conan-utils/typesHelper";
import { StateMachineController } from "../stateMachineController";
import { SmTransition } from "../events/stateMachineEvents";
import { TransactionTree } from "../../conan-tx/transactionTree";
import { StateDef } from "../core/stateDef";
export interface ForcedEvent {
    description: string;
    state: State;
    stateDef: StateDef<any>;
    logic: IConsumer<any>;
}
export declare class SmTransactions {
    orchestrator: SmOrchestrator;
    createStateTxRequest(state: State<any, any>, stateMachineController: StateMachineController<any>, txTree: TransactionTree): TransactionRequest;
    createActionTxRequest(transition: SmTransition, stateMachineController: StateMachineController<any>, txTree: TransactionTree): TransactionRequest;
    forceEvent(stateMachineController: StateMachineController<any>, forcedEvent: ForcedEvent, txTree: TransactionTree): TransactionRequest;
}
