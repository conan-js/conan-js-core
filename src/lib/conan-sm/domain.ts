import {IFunction} from "../conan-utils/typesHelper";
import {StateMachine} from "./stateMachine";


export interface BaseSmEvent {
    stageName: string,
    eventName: string,
    payload?: any;
}

export interface SmEvent extends BaseSmEvent{
    fork?: StateMachine<any, any>,
}

export interface SerializedSmEvent extends BaseSmEvent{
    fork?: SerializedSmEvent[];
}


export interface StageEntryPoint<STAGE, REQUIREMENTS = void> {
    name: string;
    create: IFunction<REQUIREMENTS, STAGE>;
}

