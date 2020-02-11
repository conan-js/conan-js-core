import {IBiConsumer, IKeyValuePairs, WithMetadata, WithMetadataArray} from "../conan-utils/typesHelper";
import {StateMachine} from "./stateMachine";

export interface SmEventCallbackParams {
    sm: StateMachine<any, any>;
}

export type SmEventCallback<ACTIONS> = IBiConsumer<ACTIONS, SmEventCallbackParams>;
export type SmListener<ACTIONS = any> = IKeyValuePairs<SmEventCallback<ACTIONS>>;
export type SmListenerDef<ACTIONS = any> = WithMetadata<SmListener<ACTIONS>, string>;
export type SmListenerDefList<FROM extends SmListener> = WithMetadataArray<FROM, string>;

export interface BasicSmListener extends SmListener {
    onStart?: SmEventCallback<void>;
    onStop?: SmEventCallback<void>;
}
