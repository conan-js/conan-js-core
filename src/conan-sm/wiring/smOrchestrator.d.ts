import { StateMachine } from "../stateMachine";
import { TransactionTree } from "../../conan-tx/transactionTree";
import { ForcedEvent, SmTransactions } from "./smTransactions";
import { State } from "../core/state";
import { ListenerDefType, SmListenerDefLike } from "../events/stateMachineListeners";
import { ICallback, WithMetadataArray } from "../../conan-utils/typesHelper";
import { StateMachineController } from "../stateMachineController";
import { SmTransition } from "../events/stateMachineEvents";
import { ForkService } from "../services/forkService";
import { Reaction, ReactionMetadata, ReactionType } from "../reactions/reactor";
export declare class SmOrchestrator {
    stateMachineTx: SmTransactions;
    forkService: ForkService;
    requestState<T = any>(stateMachineController: StateMachineController<any>, state: State<any, T>, txTree: TransactionTree): void;
    requestTransition(stateMachineController: StateMachineController<any>, transition: SmTransition, txTree: TransactionTree): void;
    runIf(stateMachineController: StateMachineController<any>, toRun: SmListenerDefLike<any>, txTree: TransactionTree): void;
    runNow(stateMachineController: StateMachineController<any>, toRun: SmListenerDefLike<any>, txTree: TransactionTree, throwError?: boolean): void;
    moveToState<T = any>(stateMachineController: StateMachineController<any>, state: State<any, T>): void;
    createStateReactions(stateMachineController: StateMachineController<any>, state: State<any, any>, txTree: TransactionTree): WithMetadataArray<ICallback, ReactionMetadata>;
    createForcedEventReactions(stateMachineController: StateMachineController<any>, forcedEvent: ForcedEvent): WithMetadataArray<ICallback, ReactionMetadata>;
    createForkReactions(state: State<any, any>, stateMachineController: StateMachineController<any>): {
        metadata: {
            executionType: ReactionType;
            name: string;
        };
        value: () => void;
    }[];
    createTransitionReactions(stateMachine: StateMachine<any>, transition: SmTransition, transactionTree: TransactionTree): WithMetadataArray<ICallback, ReactionMetadata>;
    createReactions(stateMachine: StateMachine<any>, eventName: string, type: ListenerDefType, actions: any, transactionTree: TransactionTree): WithMetadataArray<ICallback, ReactionMetadata>;
    onReactionsProcessed(stateMachine: StateMachine<any>, reactionsProcessed: WithMetadataArray<Reaction<any>, ReactionMetadata>, type: ListenerDefType, transactionTree: TransactionTree): any;
    moveToTransition(stateMachineController: StateMachineController<any>, transition: SmTransition): void;
    onTransitionRequestFromActions(stateMachineController: StateMachineController<any>, methodName: string, nextState: State, payload: any): void;
    private reactionsAsCallbacks;
    private deleteOnceListenersUsed;
}
