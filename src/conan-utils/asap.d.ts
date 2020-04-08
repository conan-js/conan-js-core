import { IConsumer, IFunction } from "./typesHelper";
export declare enum AsapType {
    NOW = "NOW",
    LATER = "LATER"
}
export declare type AsapLike<T> = Promise<T> | T | Asap<T>;
export interface Asap<T> {
    consume(consumer: IConsumer<T>): void;
    map<Z>(mapper: IFunction<T, Z>): Asap<Z>;
    ifPromise(ifPromise: IConsumer<Promise<T>>, _else?: IConsumer<T>): void;
    type: AsapType;
    assertNow(): T;
}
export declare class AsapParser {
    static from<T>(toParse: AsapLike<T>): Asap<T>;
}
export declare class Asaps {
    static now<T>(value: T): Asap<T>;
    static later<T>(promise: Promise<T>): Asap<T>;
    static delayed<T>(value: T, ms: number): Asap<T>;
}
