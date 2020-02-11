export type IFunction <I, O> = (input: I) => O;
export type IReducer <T> = IFunction<T, T>;
export type IPredicate <T> = IFunction<T, T>;
export type IFunctionVarArg = (...args: any[]) => any;
export type IBiFunction <A, B, R> = (a: A, b: B) => R;
export type ICallback = () => void;
export type IConsumer<T> = (toConsume:T) => void;
export type IBiConsumer<A, B> = (a:A, b:B) => void;
export type IProducer<T> = () => T;
export interface IKeyValuePairs<T> {[p: string]: T}
export type WithMetadataArray<VALUE, METADATA> = WithMetadata<VALUE, METADATA> []
export type WithMetadataKeyValuePairs<VALUE, METADATA> = IKeyValuePairs<WithMetadata<VALUE, METADATA>>
export interface WithMetadata<VALUE, METADATA> {
    metadata: METADATA;
    value: VALUE;
}
export type IPartial <T> = IOptSetKeyValuePairs <keyof T, any>;
export type ISetKeyValuePairs<NAMES extends keyof any, T> = {[N in NAMES]: T};
export type IOptSetKeyValuePairs<NAMES extends keyof any, T> = {[N in NAMES]?: T};

export type IConstructorProxy <TO_PROXY> = {[K in keyof TO_PROXY]: (TO_PROXY[keyof TO_PROXY] | IVarArgConstructor<TO_PROXY[keyof TO_PROXY]> | string)}

export interface IConstructor<T, D> {
    new (deps:D): T;
}
export interface IVarArgConstructor<T> {
    new (...args:any[]): T;
}

export type OneOrManyOf <T> = T | T [];

export type ProvidedOrStaticOf <RESULT extends {}, BASED_ON> = IFunction<BASED_ON, RESULT> | RESULT;

export class OneOrMany {
    static asArray<T> (toIterate: OneOrManyOf<T>): T[] {
        return Array.isArray(toIterate) ? toIterate : [toIterate];
    }
}

export class DynamicOrStatics {
    static result<BASED_ON, RESULT> (dynamicOrStatic: ProvidedOrStaticOf<BASED_ON, RESULT>, basedOn: BASED_ON): RESULT {
        return ((typeof dynamicOrStatic === 'function') ? (dynamicOrStatic as Function) (basedOn) : dynamicOrStatic);
    }
}
