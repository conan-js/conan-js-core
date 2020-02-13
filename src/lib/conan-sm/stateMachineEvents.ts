import {Stage} from "./stage";
import {IFunction} from "../conan-utils/typesHelper";
import {SmController} from "./_domain";

export interface SmTransition {
    path: string;
    payload?: any;
    into: Stage;
}

export interface BaseSmEvent {
    stageName: string,
    eventName: string,
    payload?: any;
}

export enum SmEventType {
    TRANSITION = 'TRANSITION',
    STAGE = 'STAGE'
}


export interface SmEvent <
    DATA_TYPE extends SmTransition | Stage = SmTransition | Stage,
>{
    eventName: string;
    type: SmEventType;
    data: DATA_TYPE;
    fork?: SmController<any, any>,
}

export interface StageSmEvent extends SmEvent<Stage>{
    type: SmEventType.STAGE
}

export interface TransitionSmEvent extends SmEvent<SmTransition>{
    type: SmEventType.TRANSITION
}

export function isStageEvent (toCheck: SmEvent<any>): toCheck is StageSmEvent {
    return toCheck.type === SmEventType.STAGE;
}

export function isTransitionEvent (toCheck: SmEvent<any>): toCheck is TransitionSmEvent {
    return toCheck.type === SmEventType.TRANSITION;
}

export function ifTransitionTypeIs<T> (toCheck: SmEvent<any>, ifStage: IFunction<StageSmEvent, T>, ifTransition: IFunction<TransitionSmEvent, T>): T {
    if (isStageEvent(toCheck)) {
        return ifStage(toCheck)
    } else if (isTransitionEvent(toCheck)){
        return ifTransition(toCheck)
    }

    throw new Error(`unexpected error`);
}

export interface SerializedSmEvent extends BaseSmEvent {
    fork?: SerializedSmEvent[];
}

export interface StageEntryPoint<STAGE, REQUIREMENTS = void> {
    name: string;
    create: IFunction<REQUIREMENTS, STAGE>;
}
