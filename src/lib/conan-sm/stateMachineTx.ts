import {State, StateDef} from "./state";
import {TransactionRequest} from "../conan-tx/transaction";
import {EventType} from "./stateMachineLogger";
import {SmTransition} from "./stateMachineEvents";
import {SmOrchestrator} from "./smOrchestrator";
import {SmRequestStrategy} from "./smRequestStrategy";
import {IConsumer} from "../conan-utils/typesHelper";
import {ListenerDefType, StateMachine, StateMachineEndpoint} from "./stateMachine";


export interface ForcedEvent {
    description: string;
    state: State;
    stateDef: StateDef<any, any, any>;
    logic: IConsumer<any>;
}

export class StateMachineTx {
    createStageTxRequest(
        state: State,
        orchestrator: SmOrchestrator,
        endpoint: StateMachineEndpoint,
        stateMachine: StateMachine<any>,
        requestStrategy: SmRequestStrategy
    ): TransactionRequest {
        return {
            name: `::${state.name}`,
            onStart: {
                metadata: `+tx[::${state.name}]`,
                value: () => {
                    stateMachine.log(EventType.TR_OPEN, `+tx[::${state.name}]`);
                    stateMachine.log(EventType.REQUEST, `::${state.name}`);
                    orchestrator.moveToState (stateMachine, endpoint, state);
                }
            },
            reactionsProducer: () => orchestrator.createStateReactions(stateMachine, state, requestStrategy),
            onReactionsProcessed: (reactionsProcessed) => orchestrator.onReactionsProcessed (stateMachine, reactionsProcessed, ListenerDefType.LISTENER),
            onDone: {
                metadata: `-tx[::${state.name}]`,
                value: () => {
                    stateMachine.log(EventType.TR_CLOSE, `-tx[::${state.name}]`);
                }
            }
        };
    }

    createActionTxRequest(
        transition: SmTransition,
        orchestrator: SmOrchestrator,
        endpoint: StateMachineEndpoint,
        stateMachine: StateMachine<any>,
        requestStrategy: SmRequestStrategy
    ): TransactionRequest {
        return {
            name: `=>${transition.transitionName}`,
            onStart: {
                metadata: `+tx[=>${transition.transitionName}]`,
                value: () => {
                    stateMachine.log(EventType.TR_OPEN, `+tx[=>${transition.transitionName}]`);
                    stateMachine.log(EventType.REQUEST, `=>${transition.transitionName}`);
                    endpoint.moveToTransition(transition)
                },
            },
            reactionsProducer: () => orchestrator.createTransitionReactions(stateMachine, transition),
            doChain: {
                metadata: `[request-stage]::${transition.into.name}`,
                value: () => {
                    stateMachine.log(EventType.TR_CHAIN, `//::${transition.into.name}`);
                    return this.createStageTxRequest( {
                        data: transition.payload,
                        name: transition.into.name
                    }, orchestrator, endpoint, stateMachine, requestStrategy);
                }
            },
            onReactionsProcessed: (reactionsProcessed) => orchestrator.onReactionsProcessed (stateMachine, reactionsProcessed, ListenerDefType.INTERCEPTOR),
            onDone: {
                metadata: `-tx[=>${transition.transitionName}]`,
                value: () => {
                    stateMachine.log(EventType.TR_CLOSE, `-tx[=>${transition.transitionName}]`);
                }
            }

        }
    }

    forceEvent(stateMachine: StateMachine<any>, forcedEvent: ForcedEvent, orchestrator: SmOrchestrator, requestStrategy: SmRequestStrategy): TransactionRequest  {
        return {
            name: `=>${forcedEvent.description}`,
            onStart: {
                metadata: `+tx[!${forcedEvent.description}]`,
                value: () => {
                    stateMachine.log(EventType.TR_OPEN, `+tx[!${forcedEvent.description}]`);
                },
            },
            reactionsProducer: () => orchestrator.createForcedEventReactions(stateMachine, forcedEvent, requestStrategy),
            onReactionsProcessed: (reactionsProcessed) => orchestrator.onReactionsProcessed (stateMachine, reactionsProcessed, ListenerDefType.INTERCEPTOR),
            onDone: {
                metadata: `-tx[=>${forcedEvent.description}]`,
                value: () => {
                    stateMachine.log(EventType.TR_CLOSE, `-tx[!${forcedEvent.description}]`);
                }
            }

        }

    }
}
