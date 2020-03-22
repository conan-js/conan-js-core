import {State, StateDef, StateLogicParser} from "./state";
import {EventType} from "./stateMachineLogger";
import {WithMetadataArray} from "../conan-utils/typesHelper";
import {BaseActions, ListenerType, OnEventCallback} from "./stateMachineListeners";
import {SmTransition} from "./stateMachineEvents";
import {Strings} from "../conan-utils/strings";
import {Proxyfier} from "../conan-utils/proxyfier";
import {StateMachine, StateMachineEndpoint} from "./stateMachine";
import {ListenerDefType, ListenerMetadata} from "./stateMachineCore";


export interface SmOrchestrator extends StateMachineEndpoint{
    onActionTriggered(actionName: string, nextState: State): void;

    createStateReactions(state: State): any;

    createTransitionReactions(transition: SmTransition): any;

    onReactionsProcessed(reactionsProcessed: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, type: ListenerDefType): any;

}

export class SimpleOrchestrator implements SmOrchestrator {
    constructor(
       private readonly stateMachine: StateMachine<any>,
       private readonly endpoint: StateMachineEndpoint
    ) {}

    onActionTriggered(actionName: string, nextState: State) {
        let nextStateDef: StateDef<string, any, any, any> = this.stateMachine.getStateDef(nextState.name);
        if (nextStateDef == null) {
            throw new Error('TBI');
        } else if (nextStateDef.deferredInfo != null) {
            throw new Error('TBI');
        } else {
            this.stateMachine.log(EventType.PROXY, `(${actionName})=>::${nextState.name}`);
            this.stateMachine.requestTransition({
                transitionName: actionName,
                ...nextState ? {payload: nextState.data} : undefined,
                into: nextState,
            });

        }
    }

    moveToState(state: State): void {
        this.stateMachine.log(EventType.TR_OPEN);
        this.endpoint.moveToState(state);
    }

    createStateReactions(state: State): any {
        let eventName = Strings.camelCaseWithPrefix('on', state.name);
        return this.createReactions(
            eventName,
            ListenerDefType.LISTENER,
            this.stateActions(state, this.stateMachine.getStateDef(state.name))
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

    private stateActions(state: State, stateDef: StateDef<any, any, any>): any {
        let baseActions: BaseActions = {
            requestTransition: (transition: SmTransition): void => {
                this.stateMachine.requestTransition(transition);
            },
            getStateData: (): any => {
                this.stateMachine.getStateData();
            },
            requestStage: (state: State): void => {
                this.stateMachine.requestStage(state);
            },
        };

        if (stateDef.logic == null) return baseActions;

        let actionsLogic: any = StateLogicParser.parse(stateDef.logic)(state.data);
        let proxied = Proxyfier.proxy(actionsLogic, (originalCall, metadata) => {
            let nextState: State = originalCall();
            this.onActionTriggered (metadata.methodName, nextState);

            return nextState;
        });
        return Object.assign(proxied, baseActions);

    }
}
