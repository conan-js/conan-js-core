import {Stage} from "./stage";
import {IFunction} from "../conan-utils/typesHelper";
import {SmController} from "./_domain";

export interface SmTransition {
    methodName: string;
    payload: any;
    stage: Stage;
}

export interface BaseSmEvent {
    stageName: string,
    eventName: string,
    payload?: any;
}

export interface SmEvent extends BaseSmEvent {
    fork?: SmController<any, any>,
}

export interface SerializedSmEvent extends BaseSmEvent {
    fork?: SerializedSmEvent[];
}

export interface StageEntryPoint<STAGE, REQUIREMENTS = void> {
    name: string;
    create: IFunction<REQUIREMENTS, STAGE>;
}
