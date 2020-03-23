import {State, StateDef} from "./state";
import {TransactionRequest} from "../conan-tx/transaction";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {SmTransition} from "./stateMachineEvents";
import {SmOrchestrator} from "./smOrchestrator";
import {SmRequestStrategy} from "./smRequestStrategy";
import {IConsumer} from "../conan-utils/typesHelper";
import {ListenerDefType} from "./stateMachine";


export interface ForcedEvent {
    description: string;
    state: State;
    stateDef: StateDef<any, any, any>;
    logic: IConsumer<any>;
}

export class StateMachineTx {
    constructor(
        private readonly logger: StateMachineLogger,
    ) {}

    createStageTxRequest(
        state: State,
        orchestrator: SmOrchestrator,
        requestStrategy: SmRequestStrategy
    ): TransactionRequest {
        return {
            name: `::${state.name}`,
            onStart: {
                metadata: `+tx[::${state.name}]>`,
                value: () => {
                    orchestrator.moveToState (state);
                }
            },
            reactionsProducer: () => orchestrator.createStateReactions(state, requestStrategy),
            onReactionsProcessed: (reactionsProcessed) => orchestrator.onReactionsProcessed (reactionsProcessed, ListenerDefType.LISTENER),
            onDone: {
                metadata: `-tx[::${state.name}]>`,
                value: () => {
                    this.logger.log(EventType.TR_CLOSE);
                }
            }
        };
    }

    createActionTxRequest(
        transition: SmTransition,
        orchestrator: SmOrchestrator,
        requestStrategy: SmRequestStrategy
    ): TransactionRequest {
        return {
            name: `=>${transition.transitionName}`,
            onStart: {
                metadata: `+tx[=>${transition.transitionName}]>`,
                value: () => {
                    orchestrator.moveToTransition(transition)
                },
            },
            reactionsProducer: () => orchestrator.createTransitionReactions(transition),
            doChain: {
                metadata: `[request-stage]::${transition.into.name}`,
                value: () => {
                    this.logger.log(EventType.TR_CHAIN, `//::${transition.into.name}`);
                    return this.createStageTxRequest({
                        data: transition.payload,
                        name: transition.into.name
                    }, orchestrator, requestStrategy);
                }
            },
            onReactionsProcessed: (reactionsProcessed) => orchestrator.onReactionsProcessed (reactionsProcessed, ListenerDefType.INTERCEPTOR),
            onDone: {
                metadata: `-tx[=>${transition.transitionName}]>`,
                value: () => {
                    this.logger.log(EventType.TR_CLOSE);
                }
            }

        }
    }

    forceEvent(forcedEvent: ForcedEvent, orchestrator: SmOrchestrator, requestStrategy: SmRequestStrategy): TransactionRequest  {
        return {
            name: `=>${forcedEvent.description}`,
            onStart: {
                metadata: `+tx[!${forcedEvent.description}]>`,
                value: () => {
                    this.logger.log(EventType.TR_OPEN);
                },
            },
            reactionsProducer: () => orchestrator.createForcedEventReactions(forcedEvent, requestStrategy),
            onReactionsProcessed: (reactionsProcessed) => orchestrator.onReactionsProcessed (reactionsProcessed, ListenerDefType.INTERCEPTOR),
            onDone: {
                metadata: `-tx[=>${forcedEvent.description}]>`,
                value: () => {
                    this.logger.log(EventType.TR_CLOSE);
                }
            }

        }

    }
}
