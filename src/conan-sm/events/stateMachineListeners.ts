import {IKeyValuePairs, WithMetadata, WithMetadataArray} from "../../conan-utils/typesHelper";
import {ReactionType, Reaction, ReactionMetadata} from "../reactions/reactor";


export interface BaseActions<STATE = any> {
    getStateName (): string;
    getStateData(): STATE;
}

export type SmListener<ACTIONS = any> = IKeyValuePairs<Reaction<ACTIONS>>;

export enum ListenerDefType {
    LISTENER = 'LISTENER',
    INTERCEPTOR = 'INTERCEPTOR',
}

export type SmListenerDef<
    LISTENER extends SmListener<ACTIONS>,
    ACTIONS  = any
> = WithMetadata<LISTENER, ReactionMetadata>;

export type SmListenerDefList<
    LISTENER extends SmListener<ACTIONS>,
    ACTIONS  = any
> = WithMetadataArray<LISTENER, ReactionMetadata>;

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
    isAnonymous (toTransform: SmListenerDefLike <any>): toTransform is SmListener {
        return !Array.isArray(toTransform) && ((toTransform as any).metadata);
    }

    isTuple (toTransform: SmListenerDefLike<any>): toTransform is SmListenerDefTuple<any> {
        return Array.isArray(toTransform);
    }

    isDef (toTransform: SmListenerDefLike<any>): toTransform is SmListenerDef<any>  {
        return !Array.isArray(toTransform) && (!(toTransform as any).metadata);
    }

    parse <T extends SmListener>(toParse: SmListenerDefLike<T>, type: ReactionType): SmListenerDef<T> {
        if (this.isDef(toParse)) {
            return toParse;
        } else if (this.isAnonymous(toParse)){
            return {metadata: {name: 'anonymous', executionType: ReactionType.ALWAYS}, value: toParse}
        } else if (this.isTuple(toParse)) {
            return {metadata: {name: toParse[0], executionType: type}, value: toParse[1]};
        } else {
            throw new Error(`error parsing as SmListenerDef: ${toParse}`)
        }
    }
}

