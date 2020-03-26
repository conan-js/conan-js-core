import {State, StateDef, StateLogicParser} from "../core/state";
import {EventType} from "../stateMachineLogger";
import {StateMachine} from "../stateMachine";
import {BaseActions} from "../core/stateMachineListeners";
import {SmTransition} from "../stateMachineEvents";
import {Proxyfier} from "../../conan-utils/proxyfier";

export interface SmRequestStrategy {
    onTransitionRequest(stateMachine: StateMachine<any>, actionName: string, nextState: State, payload?: any): void;

    stateActions(stateMachine: StateMachine<any>, state: State, stateDef: StateDef<any, any, any>): any;
}

export abstract class BaseSmRequestStrategy implements SmRequestStrategy{
    public stateActions(stateMachine: StateMachine<any>, state: State, stateDef: StateDef<any, any, any>): any {
        let baseActions: BaseActions = {
            getStateName (): string{
                return stateMachine.getStateName();
            },
            requestTransition: (transition: SmTransition): void => {
                stateMachine.log(EventType.PROXY, `(${transition.transitionName})=>::${transition.into.name}`);
                stateMachine.requestTransition(transition);
            },
            getStateData: (): any => {
                return stateMachine.getStateData();
            },
            requestStage: (state: State): void => {
                stateMachine.log(EventType.PROXY, `::${state.name}`);
                stateMachine.requestState(state);
            },
        };

        if (stateDef.logic == null) return baseActions;

        let actionsLogic: any = StateLogicParser.parse(stateDef.logic)(state.data);
        let proxied = Proxyfier.proxy(actionsLogic, (originalCall, metadata) => {
            let nextState: State = originalCall();
            stateMachine.log(EventType.PROXY, `(${metadata.methodName})=>::${nextState.name}`);
            this.onTransitionRequest (stateMachine, metadata.methodName, nextState, metadata.payload);

            return nextState;
        });
        return Object.assign(proxied, baseActions);
    }

    abstract onTransitionRequest(stateMachine: StateMachine<any>, actionName: string, nextState: State, payload?: any): void;
}


