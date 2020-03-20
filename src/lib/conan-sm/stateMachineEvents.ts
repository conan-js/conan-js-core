import {Stage} from "./stage";
import {StateMachine} from "./stateMachine";

export interface SmTransition {
    transitionName: string;
    payload?: any;
    transition: Stage;
}
export interface StageSmEvent{
    stateName: string;
    data?: any;
}

export interface RawTransitionSmEvent {
    transitionName: string;
    payload?: any;
    fork?: StateMachine<any, any>;
}
export interface TransitionSmEvent {
    transitionName: string;
    payload?: any;
    fork?: SerializedSmEvent[];
}

export function isStageEvent (toCheck: RawTransitionSmEvent | StageSmEvent): toCheck is StageSmEvent {
    return "stageName" in toCheck;
}
export type SerializedSmEvent = StageSmEvent | TransitionSmEvent;
