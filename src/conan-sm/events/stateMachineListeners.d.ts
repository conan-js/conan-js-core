import { IKeyValuePairs, WithMetadata, WithMetadataArray } from "../../conan-utils/typesHelper";
import { ReactionType, Reaction, ReactionMetadata } from "../reactions/reactor";
export interface BaseActions<STATE = any> {
    getStateName(): string;
    getStateData(): STATE;
}
export declare type SmListener<ACTIONS = any> = IKeyValuePairs<Reaction<ACTIONS>>;
export declare enum ListenerDefType {
    LISTENER = "LISTENER",
    INTERCEPTOR = "INTERCEPTOR"
}
export declare type SmListenerDef<LISTENER extends SmListener<ACTIONS>, ACTIONS = any> = WithMetadata<LISTENER, ReactionMetadata>;
export declare type SmListenerDefList<LISTENER extends SmListener<ACTIONS>, ACTIONS = any> = WithMetadataArray<LISTENER, ReactionMetadata>;
export declare type AnonymousDefTuple<LISTENER extends SmListener<ACTIONS>, ACTIONS = any> = LISTENER;
export declare type SmListenerDefTuple<LISTENER extends SmListener<ACTIONS>, ACTIONS = any> = [string, LISTENER];
export declare type SmListenerDefLike<LISTENER extends SmListener<ACTIONS>, ACTIONS = any> = LISTENER | SmListenerDefTuple<LISTENER, ACTIONS> | AnonymousDefTuple<LISTENER, ACTIONS>;
export declare class SmListenerDefLikeParser {
    isAnonymous(toTransform: SmListenerDefLike<any>): toTransform is SmListener;
    isTuple(toTransform: SmListenerDefLike<any>): toTransform is SmListenerDefTuple<any>;
    isDef(toTransform: SmListenerDefLike<any>): toTransform is SmListenerDef<any>;
    parse<T extends SmListener>(toParse: SmListenerDefLike<T>, type: ReactionType): SmListenerDef<T>;
}
