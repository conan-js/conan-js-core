import {IBiConsumer, IFunction, IKeyValuePairs, WithMetadata, WithMetadataArray} from "../conan-utils/typesHelper";
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

export interface SmListenerParams {
    sm: StateMachine<any, any>;
}

export type SmEventCallback <ACTIONS> = IBiConsumer<ACTIONS, SmListenerParams>;

export type SmListener <ACTIONS = any>= IKeyValuePairs<SmEventCallback<ACTIONS>>;
export type SmListenerDef <ACTIONS = any>= WithMetadata<SmListener<ACTIONS>, string>;
export type SmListenerDefList <FROM extends SmListener>= WithMetadataArray<FROM, string>;

export interface BasicSmListener extends SmListener{
    onStart?: SmEventCallback<void>;
    onStop?: SmEventCallback<void>;
}

