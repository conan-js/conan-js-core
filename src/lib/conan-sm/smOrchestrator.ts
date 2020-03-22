import {State} from "./state";
import {EventType} from "./stateMachineLogger";
import {WithMetadataArray} from "../conan-utils/typesHelper";
import {ListenerType, OnEventCallback} from "./stateMachineListeners";
import {SmTransition} from "./stateMachineEvents";
import {Strings} from "../conan-utils/strings";
import {StateMachine, StateMachineEndpoint} from "./stateMachine";
import {ListenerDefType, ListenerMetadata} from "./stateMachineCore";
import {SmRequestStrategy} from "./smRequestStrategy";


export class SmOrchestrator {
    constructor(
       private readonly stateMachine: StateMachine<any>,
       private readonly endpoint: StateMachineEndpoint,
    ) {}

    moveToState(state: State): void {
        this.stateMachine.log(EventType.TR_OPEN);
        this.endpoint.moveToState(state);
    }

    createStateReactions(state: State, requestStrategy: SmRequestStrategy): any {
        let eventName = Strings.camelCaseWithPrefix('on', state.name);
        return this.createReactions(
            eventName,
            ListenerDefType.LISTENER,
            requestStrategy.stateActions(state, this.stateMachine.getStateDef(state.name))
        )
    }

    createTransitionReactions(transition: SmTransition): any {
        return this.createReactions(
            Strings.camelCaseWithPrefix('on',  transition.transitionName),
            ListenerDefType.INTERCEPTOR,
            {}
        )
    }

    createReactions(eventName: string, type: ListenerDefType, actions: any): any {
        return this.reactionsAsCallbacks(this.stateMachine.createReactions(eventName, type), actions)
    }

    onReactionsProcessed(reactionsProcessed: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, type: ListenerDefType): any {
        this.deleteOnceListenersUsed(reactionsProcessed, type)
    }

    moveToTransition(transition: SmTransition): void {
        this.stateMachine.log(EventType.TR_OPEN);
        this.endpoint.moveToTransition(transition);
    }

    private reactionsAsCallbacks(reactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, actions: any) {
        return reactions.map(it => ({
            metadata: it.metadata,
            value: () => it.value(actions)
        }));
    }

    private deleteOnceListenersUsed(reactionsProcessed: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, type: ListenerDefType) {
        this.stateMachine.deleteListeners(
            reactionsProcessed
                .filter(it => it.metadata.executionType === ListenerType.ONCE)
                .map(it => it.metadata.name)
            , type);
    }

}
