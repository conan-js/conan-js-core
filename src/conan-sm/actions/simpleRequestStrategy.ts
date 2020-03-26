import {StateMachine} from "../stateMachine";
import {State, StateDef} from "../..";
import {BaseSmRequestStrategy} from "./smRequestStrategy";

export class SimpleSmRequestStrategy extends BaseSmRequestStrategy {
    onTransitionRequest(stateMachine: StateMachine<any>, actionName: string, nextState: State, payload?: any): void {
        let nextStateDef: StateDef<string, any, any, any> = stateMachine.getStateDef(nextState.name);
        if (nextStateDef == null) {
            throw new Error('unexpected error');
        } else if (nextStateDef.deferredInfo != null) {
            throw new Error('unexpected error');
        } else {
            stateMachine.requestTransition({
                transitionName: actionName,
                ...payload ? {payload: payload} : undefined,
                into: nextState,
            });
        }
    }
}
