import {State} from "../core/state";
import {EventType} from "../stateMachineLogger";
import {ICallback, WithMetadataArray} from "../../conan-utils/typesHelper";
import {ListenerType, OnEventCallback} from "../core/stateMachineListeners";
import {SmTransition} from "../stateMachineEvents";
import {Strings} from "../../conan-utils/strings";
import {ListenerDefType, ListenerMetadata, StateMachine} from "../stateMachine";
import {SmRequestStrategy} from "./smRequestStrategy";
import {ForcedEvent} from "./stateMachineTx";
import {TransactionTree} from "../../conan-tx/transactionTree";
import {StateMachineCoreWrite} from "../core/stateMachineCore";


export class SmOrchestrator {
    moveToState(stateMachine: StateMachine<any>, endpoint: StateMachineCoreWrite, state: State): void {
        stateMachine.log(EventType.STAGE,  `::${state.name}`, [
            [`::${state.name}`, state.data == null ? undefined : state.data]
        ]);
        endpoint.moveToState(state);
    }

    createStateReactions(stateMachine: StateMachine<any>, state: State, requestStrategy: SmRequestStrategy, transactionTree: TransactionTree): WithMetadataArray<ICallback, ListenerMetadata> {
        let eventName = Strings.camelCaseWithPrefix('on', state.name);
        return this.createReactions(
            stateMachine,
            eventName,
            ListenerDefType.LISTENER,
            requestStrategy.stateActions(stateMachine, state, stateMachine.getStateDef(state.name)),
            transactionTree
        )
    }

    createForcedEventReactions(stateMachine: StateMachine<any>, forcedEvent: ForcedEvent, requestStrategy: SmRequestStrategy): WithMetadataArray<ICallback, ListenerMetadata> {
        return [{
            metadata: {
                executionType: ListenerType.ONCE,
                name: forcedEvent.description
            },
            value: ()=> forcedEvent.logic (requestStrategy.stateActions(stateMachine, forcedEvent.state, forcedEvent.stateDef))
        }]
    }

    createTransitionReactions(stateMachine: StateMachine<any>, transition: SmTransition, transactionTree: TransactionTree): WithMetadataArray<ICallback, ListenerMetadata> {
        return this.createReactions(
            stateMachine,
            Strings.camelCaseWithPrefix('on',  transition.transitionName),
            ListenerDefType.INTERCEPTOR,
            {},
            transactionTree
        )
    }

    createReactions(stateMachine: StateMachine<any>, eventName: string, type: ListenerDefType, actions: any, transactionTree: TransactionTree): WithMetadataArray<ICallback, ListenerMetadata> {
        return this.reactionsAsCallbacks(stateMachine.createReactions(eventName, type, transactionTree), actions)
    }

    onReactionsProcessed(stateMachine: StateMachine<any>, reactionsProcessed: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, type: ListenerDefType, transactionTree: TransactionTree): any {
        this.deleteOnceListenersUsed(stateMachine, reactionsProcessed, type, transactionTree)
    }

    moveToTransition(stateMachine: StateMachine<any>, endpoint: StateMachineCoreWrite, transition: SmTransition): void {
        stateMachine.log(EventType.ACTION, `=>${transition.transitionName}`, [
            [`::${stateMachine.getStateName()}=>${transition.transitionName}`, transition.payload == null ? undefined : transition.payload]
        ]);
        endpoint.moveToTransition(transition);
    }

    private reactionsAsCallbacks(reactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, actions: any): WithMetadataArray<ICallback, ListenerMetadata> {
        return reactions.map(it => ({
            metadata: it.metadata,
            value: () => it.value(actions)
        }));
    }

    private deleteOnceListenersUsed(stateMachine: StateMachine<any>, reactionsProcessed: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, type: ListenerDefType, transactionTree: TransactionTree): void {
        stateMachine.deleteListeners(
            reactionsProcessed
                .filter(it => it.metadata.executionType === ListenerType.ONCE)
                .map(it => it.metadata.name)
            , type, transactionTree);
    }
}
