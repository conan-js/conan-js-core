import {IConsumer, State, StateDef} from "../..";
import {TransactionRequest} from "../../conan-tx/transaction";
import {EventType} from "../stateMachineLogger";
import {SmTransition} from "../stateMachineEvents";
import {RuntimeInformation, SmOrchestrator} from "./smOrchestrator";
import {ListenerDefType, StateMachineFacade} from "../stateMachine";


export interface ForcedEvent {
    description: string;
    state: State;
    stateDef: StateDef<any, any, any>;
    logic: IConsumer<any>;
}

export class SmTransactions {
    public orchestrator: SmOrchestrator;

    createStateTxRequest(
        state: State,
        stateMachineFacade: StateMachineFacade<any>,
        runtimeInfo: RuntimeInformation
    ): TransactionRequest {
        return {
            name: `::${state.name}`,
            onStart: {
                metadata: `+tx[::${state.name}]`,
                value: () => {
                    stateMachineFacade.log(EventType.TR_OPEN, `+tx[::${state.name}]`);
                    stateMachineFacade.log(EventType.REQUEST, `::${state.name}`);
                    this.orchestrator.moveToState (stateMachineFacade, state);
                }
            },
            reactionsProducer: () => this.orchestrator.createStateReactions(stateMachineFacade, state, runtimeInfo),
            onReactionsProcessed: (reactionsProcessed) => this.orchestrator.onReactionsProcessed (stateMachineFacade, reactionsProcessed, ListenerDefType.LISTENER, runtimeInfo.txTree),
            onDone: {
                metadata: `-tx[::${state.name}]`,
                value: () => {
                    stateMachineFacade.log(EventType.TR_CLOSE, `-tx[::${state.name}]`);
                }
            }
        };
    }

    createActionTxRequest(
        transition: SmTransition,
        stateMachineFacade: StateMachineFacade<any>,
        runtimeInfo: RuntimeInformation
    ): TransactionRequest {
        return {
            name: `=>${transition.transitionName}`,
            onStart: {
                metadata: `+tx[=>${transition.transitionName}]`,
                value: () => {
                    stateMachineFacade.log(EventType.TR_OPEN, `+tx[=>${transition.transitionName}]`);
                    stateMachineFacade.log(EventType.REQUEST, `=>${transition.transitionName}`);
                    this.orchestrator.moveToTransition(stateMachineFacade, transition)
                },
            },
            reactionsProducer: () => this.orchestrator.createTransitionReactions(stateMachineFacade, transition, runtimeInfo.txTree),
            doChain: {
                metadata: `[request-stage]::${transition.into.name}`,
                value: () => {
                    stateMachineFacade.log(EventType.TR_CHAIN, `//::${transition.into.name}`);
                    return this.createStateTxRequest( {
                        data: transition.into.data,
                        name: transition.into.name
                    }, stateMachineFacade, runtimeInfo);
                }
            },
            onReactionsProcessed: (reactionsProcessed) => this.orchestrator.onReactionsProcessed (stateMachineFacade, reactionsProcessed, ListenerDefType.INTERCEPTOR, runtimeInfo.txTree),
            onDone: {
                metadata: `-tx[=>${transition.transitionName}]`,
                value: () => {
                    stateMachineFacade.log(EventType.TR_CLOSE, `-tx[=>${transition.transitionName}]`);
                }
            }

        }
    }

    forceEvent(
        stateMachineFacade: StateMachineFacade<any>,
        forcedEvent: ForcedEvent,
        runtimeInfo: RuntimeInformation
    ): TransactionRequest  {
        return {
            name: `=>${forcedEvent.description}`,
            onStart: {
                metadata: `+tx[!${forcedEvent.description}]`,
                value: () => {
                    stateMachineFacade.log(EventType.TR_OPEN, `+tx[!${forcedEvent.description}]`);
                },
            },
            reactionsProducer: () => this.orchestrator.createForcedEventReactions(stateMachineFacade, forcedEvent, runtimeInfo.requestStrategy),
            onReactionsProcessed: (reactionsProcessed) => this.orchestrator.onReactionsProcessed (stateMachineFacade, reactionsProcessed, ListenerDefType.INTERCEPTOR, runtimeInfo.txTree),
            onDone: {
                metadata: `-tx[=>${forcedEvent.description}]`,
                value: () => {
                    stateMachineFacade.log(EventType.TR_CLOSE, `-tx[!${forcedEvent.description}]`);
                }
            }

        }

    }
}
