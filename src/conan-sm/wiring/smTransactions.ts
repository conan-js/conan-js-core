import {TransactionRequest} from "../../conan-tx/transaction";
import {SmOrchestrator} from "./smOrchestrator";
import {State} from "../core/state";
import {IConsumer} from "../../conan-utils/typesHelper";
import {StateMachineController} from "../stateMachineController";
import {EventType} from "../logging/stateMachineLogger";
import {SmTransition} from "../events/stateMachineEvents";
import {ListenerDefType} from "../events/stateMachineListeners";
import {TransactionTree} from "../../conan-tx/transactionTree";
import {StateDef} from "../core/stateDef";


export interface ForcedEvent {
    description: string;
    state: State;
    stateDef: StateDef<any>;
    logic: IConsumer<any>;
}

export class SmTransactions {
    public orchestrator: SmOrchestrator;

    createStateTxRequest(
        state: State<any, any>,
        stateMachineController: StateMachineController<any>,
        txTree: TransactionTree,
    ): TransactionRequest {
        return {
            name: `::${state.name}`,
            onStart: {
                metadata: `+tx[::${state.name}]`,
                value: () => {
                    stateMachineController.log(EventType.TR_OPEN, `+tx[::${state.name}]`);
                    stateMachineController.log(EventType.REQUEST, `::${state.name}`);
                    this.orchestrator.moveToState (stateMachineController, state);
                }
            },
            reactionsProducer: () => this.orchestrator.createStateReactions(stateMachineController, state, txTree),
            onReactionsProcessed: (reactionsProcessed) => this.orchestrator.onReactionsProcessed (stateMachineController, reactionsProcessed, ListenerDefType.LISTENER, txTree),
            onDone: {
                metadata: `-tx[::${state.name}]`,
                value: () => {
                    stateMachineController.log(EventType.TR_CLOSE, `-tx[::${state.name}]`);
                }
            }
        };
    }

    createActionTxRequest(
        transition: SmTransition,
        stateMachineController: StateMachineController<any>,
        txTree: TransactionTree
    ): TransactionRequest {
        return {
            name: `=>${transition.transitionName}`,
            onStart: {
                metadata: `+tx[=>${transition.transitionName}]`,
                value: () => {
                    stateMachineController.log(EventType.TR_OPEN, `+tx[=>${transition.transitionName}]`);
                    stateMachineController.log(EventType.REQUEST, `=>${transition.transitionName}`);
                    this.orchestrator.moveToTransition(stateMachineController, transition)
                },
            },
            reactionsProducer: () => this.orchestrator.createTransitionReactions(stateMachineController, transition, txTree),
            doChain: {
                metadata: `[request-stage]::${transition.into.name}`,
                value: () => {
                    stateMachineController.log(EventType.TR_CHAIN, `//::${transition.into.name}`);
                    return this.createStateTxRequest( {
                        data: transition.into.data,
                        name: transition.into.name
                    }, stateMachineController, txTree);
                }
            },
            onReactionsProcessed: (reactionsProcessed) => this.orchestrator.onReactionsProcessed (stateMachineController, reactionsProcessed, ListenerDefType.INTERCEPTOR, txTree),
            onDone: {
                metadata: `-tx[=>${transition.transitionName}]`,
                value: () => {
                    stateMachineController.log(EventType.TR_CLOSE, `-tx[=>${transition.transitionName}]`);
                }
            }

        }
    }

    forceEvent(
        stateMachineController: StateMachineController<any>,
        forcedEvent: ForcedEvent,
        txTree: TransactionTree
    ): TransactionRequest  {
        return {
            name: `=>${forcedEvent.description}`,
            onStart: {
                metadata: `+tx[!${forcedEvent.description}]`,
                value: () => {
                    stateMachineController.log(EventType.TR_OPEN, `+tx[!${forcedEvent.description}]`);
                },
            },
            reactionsProducer: () => this.orchestrator.createForcedEventReactions(stateMachineController, forcedEvent),
            onReactionsProcessed: (reactionsProcessed) => this.orchestrator.onReactionsProcessed (stateMachineController, reactionsProcessed, ListenerDefType.INTERCEPTOR, txTree),
            onDone: {
                metadata: `-tx[=>${forcedEvent.description}]`,
                value: () => {
                    stateMachineController.log(EventType.TR_CLOSE, `-tx[!${forcedEvent.description}]`);
                }
            }

        }

    }
}
