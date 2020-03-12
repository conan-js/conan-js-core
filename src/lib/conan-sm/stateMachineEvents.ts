import {Stage} from "./stage";
import {SmController} from "./_domain";

export interface SmTransition {
    transitionName: string;
    payload?: any;
    transition: Stage;
}


export enum SmEventType {
    TRANSITION = 'TRANSITION',
    STAGE = 'STAGE'
}


export interface StageSmEvent{
    stateName: string;
    data?: any;
}

export interface RawTransitionSmEvent {
    transitionName: string;
    payload?: any;
    fork?: SmController<any, any>;
}
export interface TransitionSmEvent {
    transitionName: string;
    payload?: any;
    fork?: SerializedSmEvent[];
}

export function isStageEvent (toCheck: RawTransitionSmEvent | StageSmEvent): toCheck is StageSmEvent {
    return "stageName" in toCheck;
}

export function isTransitionEvent (toCheck: RawTransitionSmEvent | StageSmEvent): toCheck is RawTransitionSmEvent {
    return "transitionName" in toCheck;
}


export type SerializedSmEvent = StageSmEvent | TransitionSmEvent;
