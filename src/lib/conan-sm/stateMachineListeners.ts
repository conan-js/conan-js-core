import {IConsumer, IKeyValuePairs, WithMetadata, WithMetadataArray} from "../conan-utils/typesHelper";
import {State} from "./state";
import {SmTransition} from "./stateMachineEvents";
import {ListenerMetadata} from "./stateMachineCore";


export interface BaseActions {
    getStateData(): any;
    requestStage(state: State): void;
    requestTransition(transition: SmTransition): void;
}

export type OnEventCallback<ACTIONS> = IConsumer<ACTIONS & BaseActions>;
export type SmListener<ACTIONS = any> = IKeyValuePairs<OnEventCallback<ACTIONS>>;

export type SmListenerDef<
    LISTENER extends SmListener<ACTIONS>,
    ACTIONS  = any
> = WithMetadata<LISTENER, ListenerMetadata>;

export type SmListenerDefList<
    LISTENER extends SmListener<ACTIONS>,
    ACTIONS  = any
> = WithMetadataArray<LISTENER, ListenerMetadata>;

export interface BasicSmListener extends SmListener<any> {
    onStart?: OnEventCallback<BaseActions>;
    onStop?: OnEventCallback<BaseActions>;
}

export type AnonymousDefTuple<
    LISTENER extends SmListener<ACTIONS>,
    ACTIONS  = any
> = LISTENER;

export type SmListenerDefTuple<
    LISTENER extends SmListener<ACTIONS>,
    ACTIONS  = any
> = [string, LISTENER];


export type SmListenerDefLike<
    LISTENER extends SmListener<ACTIONS>,
    ACTIONS  = any
> =
    LISTENER |
    SmListenerDefTuple<LISTENER, ACTIONS> |
    AnonymousDefTuple<LISTENER, ACTIONS>;

export class SmListenerDefLikeParser {
    isAnonymous (toTransform: SmListenerDefLike <any>): toTransform is SmListener<any> {
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
