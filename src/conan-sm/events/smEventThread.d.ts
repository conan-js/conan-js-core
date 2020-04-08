import { State } from "../core/state";
import { StateMachineCore } from "../core/stateMachineCore";
import { RawTransitionSmEvent, SerializedSmEvent, SmTransition } from "./stateMachineEvents";
export declare class SmEventThread {
    currentTransitionEvent: RawTransitionSmEvent;
    currentStateEvent: State<any, any>;
    currentEvent: RawTransitionSmEvent | State;
    private readonly events;
    serialize(): SerializedSmEvent[];
    addActionEvent(transitionEvent: SmTransition, fork?: StateMachineCore<any>): void;
    addStageEvent(stage: State<any, any>): void;
    getCurrentStateName(): string;
    private addEvent;
    getCurrentTransitionName(): string;
    getCurrentState(): State<any, any>;
}
