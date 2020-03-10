import {IBiConsumer, IKeyValuePairs, WithMetadata, WithMetadataArray} from "../conan-utils/typesHelper";
import {SmController} from "./_domain";
import {ListenerMetadata} from "./stateMachineImpl";

export interface SmEventCallbackParams {
    sm: SmController<any, any>;
}

export type OnEventCallback<ACTIONS> = IBiConsumer<ACTIONS, SmEventCallbackParams>;
export type SmListener<ACTIONS = any> = IKeyValuePairs<OnEventCallback<ACTIONS>>;

export type SmListenerDef<
    LISTENER extends SmListener<ACTIONS>,
    ACTIONS = any
> = WithMetadata<LISTENER, ListenerMetadata>;

export type SmListenerDefList<
    LISTENER extends SmListener<ACTIONS>,
    ACTIONS = any
> = WithMetadataArray<LISTENER, ListenerMetadata>;

export interface BasicSmListener extends SmListener {
    onStart?: OnEventCallback<void>;
    onStop?: OnEventCallback<void>;
}

export type AnonymousDefTuple<
    LISTENER extends SmListener<ACTIONS>,
    ACTIONS = any
> = LISTENER;

export type SmListenerDefTuple<
    LISTENER extends SmListener<ACTIONS>,
    ACTIONS = any
> = [string, LISTENER];


export type SmListenerDefLike<
    LISTENER extends SmListener<ACTIONS>,
    ACTIONS = any
> =
    LISTENER |
    SmListenerDefTuple<LISTENER, ACTIONS> |
    AnonymousDefTuple<LISTENER, ACTIONS>;

export class SmListenerDefLikeParser {
    isAnonymous (toTransform: SmListenerDefLike <any>): toTransform is SmListener {
        return !Array.isArray(toTransform) && ((toTransform as any).metadata);
    }

    isTuple (toTransform: SmListenerDefLike<any>): toTransform is SmListenerDefTuple<any> {
        return Array.isArray(toTransform);
    }

    isDef (toTransform: SmListenerDefLike<any>): toTransform is SmListenerDef<any>  {
        return !Array.isArray(toTransform) && (!(toTransform as any).metadata);
    }

    parse <T extends SmListener>(toParse: SmListenerDefLike<T>, type: ListenerType): SmListenerDef<T> {
        if (this.isDef(toParse)) {
            return toParse;
        } else if (this.isAnonymous(toParse)){
            return {metadata: {name: 'anonymous', executionType: ListenerType.ALWAYS}, value: toParse}
        } else if (this.isTuple(toParse)) {
            return {metadata: {name: toParse[0], executionType: type}, value: toParse[1]};
        } else {
            throw new Error(`error parsing as SmListenerDef: ${toParse}`)
        }
    }
}

export enum ListenerType {
    ONCE = 'ONCE',
    ALWAYS = 'ALWAYS',
}
