import {
    IBiConsumer,
    IKeyValuePairs,
    IOptSetKeyValuePairs,
    WithMetadata,
    WithMetadataArray
} from "../conan-utils/typesHelper";
import {StateMachine} from "./stateMachine";

export interface SmEventCallbackParams {
    sm: StateMachine<any, any>;
}

export type SmEventCallback<ACTIONS> = IBiConsumer<ACTIONS, SmEventCallbackParams>;
export type SmListener<ACTIONS = any> = IKeyValuePairs<SmEventCallback<ACTIONS>>;

export type SmListenerDef<
    LISTENER extends SmListener<ACTIONS>,
    ACTIONS = any
> = WithMetadata<LISTENER, string>;

export type SmListenerDefList<
    LISTENER extends SmListener<ACTIONS>,
    ACTIONS = any
> = WithMetadataArray<LISTENER, string>;

export interface BasicSmListener extends SmListener {
    onStart?: SmEventCallback<void>;
    onStop?: SmEventCallback<void>;
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

    parse <T extends SmListener>(toParse: SmListenerDefLike<T>): SmListenerDef<T> {
        if (this.isDef(toParse)) {
            return toParse;
        } else if (this.isAnonymous(toParse)){
            return {metadata: 'anonymous', value: toParse}
        } else if (this.isTuple(toParse)) {
            return {metadata: toParse[0], value: toParse[1]};
        } else {
            throw new Error(`error parsing as SmListenerDef: ${toParse}`)
        }
    }
}

export enum ListenerType {
    ONCE = 'ONCE',
    ALWAYS = 'ALWAYS',
}
