import { State } from "../core/state";
import { StateMachineCore } from "../core/stateMachineCore";
export interface SmTransition {
    transitionName: string;
    payload?: any;
    into: State;
}
export interface RawTransitionSmEvent {
    transitionName: string;
    payload?: any;
    fork?: StateMachineCore<any>;
}
export interface TransitionSmEvent {
    transitionName: string;
    payload?: any;
    fork?: SerializedSmEvent[];
}
export declare function isStageEvent(toCheck: RawTransitionSmEvent | State): toCheck is State;
export declare type SerializedSmEvent = State | TransitionSmEvent;
