import {State} from "./state";
import {TransactionRequest} from "../conan-tx/transaction";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {SmTransition} from "./stateMachineEvents";
import {SmOrchestrator} from "./smOrchestrator";
import {ListenerDefType} from "./stateMachineCore";

export class StateMachineTx {
    constructor(
        private readonly orchestrator: SmOrchestrator,
        private readonly logger: StateMachineLogger,
    ) {}

    createStageTxRequest(
        state: State,
    ): TransactionRequest {
        return {
            name: `::${state.name}`,
            onStart: {
                metadata: `+tx[::${state.name}]>`,
                value: () => {
                    this.orchestrator.moveToState (state);
                }
            },
            reactionsProducer: () => this.orchestrator.createStateReactions(state),
            onReactionsProcessed: (reactionsProcessed) => this.orchestrator.onReactionsProcessed (reactionsProcessed, ListenerDefType.LISTENER),
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
    ): TransactionRequest {
        return {
            name: `=>${transition.transitionName}`,
            onStart: {
                metadata: `+tx[=>${transition.transitionName}]>`,
                value: () => {
                    this.orchestrator.moveToAction(transition)
                },
            },
            reactionsProducer: () => this.orchestrator.createTransitionReactions(transition),
            doChain: {
                metadata: `[request-stage]::${transition.into.name}`,
                value: () => {
                    this.logger.log(EventType.TR_CHAIN, `//::${transition.into.name}`);
                    return this.createStageTxRequest({
                        data: transition.payload,
                        name: transition.into.name
                    });
                }
            },
            onReactionsProcessed: (reactionsProcessed) => this.orchestrator.onReactionsProcessed (reactionsProcessed, ListenerDefType.INTERCEPTOR)
        }
    }
}
