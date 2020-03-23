import {State} from "./state";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {ICallback, WithMetadataArray} from "../conan-utils/typesHelper";
import {ListenerType, OnEventCallback} from "./stateMachineListeners";
import {SmTransition} from "./stateMachineEvents";
import {Strings} from "../conan-utils/strings";
import {ListenerDefType, ListenerMetadata, StateMachine, StateMachineEndpoint} from "./stateMachine";
import {SmRequestStrategy} from "./smRequestStrategy";
import {ForcedEvent} from "./stateMachineTx";


export class SmOrchestrator {
    moveToState(stateMachine: StateMachine<any>, endpoint: StateMachineEndpoint, state: State): void {
        stateMachine.log(EventType.STAGE,  `::${state.name}`, [
            [`current state`, state.data == null ? undefined : JSON.stringify(state.data)]
        ]);
        endpoint.moveToState(state);
    }

    createStateReactions(stateMachine: StateMachine<any>, state: State, requestStrategy: SmRequestStrategy): WithMetadataArray<ICallback, ListenerMetadata> {
        let eventName = Strings.camelCaseWithPrefix('on', state.name);
        return this.createReactions(
            stateMachine,
            eventName,
            ListenerDefType.LISTENER,
            requestStrategy.stateActions(stateMachine, state, stateMachine.getStateDef(state.name))
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

    createTransitionReactions(stateMachine: StateMachine<any>, transition: SmTransition): WithMetadataArray<ICallback, ListenerMetadata> {
        return this.createReactions(
            stateMachine,
            Strings.camelCaseWithPrefix('on',  transition.transitionName),
            ListenerDefType.INTERCEPTOR,
            {}
        )
    }

    createReactions(stateMachine: StateMachine<any>, eventName: string, type: ListenerDefType, actions: any): WithMetadataArray<ICallback, ListenerMetadata> {
        return this.reactionsAsCallbacks(stateMachine.createReactions(eventName, type), actions)
    }

    onReactionsProcessed(stateMachine: StateMachine<any>, reactionsProcessed: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, type: ListenerDefType): any {
        this.deleteOnceListenersUsed(stateMachine, reactionsProcessed, type)
    }

    moveToTransition(stateMachine: StateMachine<any>, endpoint: StateMachineEndpoint, transition: SmTransition): void {
        stateMachine.log(EventType.ACTION, `=>${transition.transitionName}`, [
            [`payload`, transition.payload == null ? undefined : JSON.stringify(transition.payload)]
        ]);
        endpoint.moveToTransition(transition);
    }

    private reactionsAsCallbacks(reactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, actions: any): WithMetadataArray<ICallback, ListenerMetadata> {
        return reactions.map(it => ({
            metadata: it.metadata,
            value: () => it.value(actions)
        }));
    }

    private deleteOnceListenersUsed(stateMachine: StateMachine<any>, reactionsProcessed: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, type: ListenerDefType): void {
        stateMachine.deleteListeners(
            reactionsProcessed
                .filter(it => it.metadata.executionType === ListenerType.ONCE)
                .map(it => it.metadata.name)
            , type);
    }
}
