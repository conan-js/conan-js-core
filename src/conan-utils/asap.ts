import {IConsumer, IFunction} from "./typesHelper";

export enum AsapType {
    NOW = 'NOW',
    LATER = 'LATER'
}

export type AsapLike<T> = Promise<T> | T | Asap<T>;
export interface Asap<T> {
    consume (consumer: IConsumer<T>): void;

    map<Z>(mapper: IFunction<T, Z>): Asap<Z>;

    ifPromise (ifPromise: IConsumer<Promise<T>>, _else?: IConsumer<T>): void;

    type: AsapType;

    assertNow(): T;
}

function isPromise<T> (toParse: AsapLike<T>): toParse is Promise<T> {
    return ('then' in toParse) && typeof(toParse.then) === 'function'
}

function isAsapAlready<T> (toParse: AsapLike<T>): toParse is Asap<T> {
    return (toParse instanceof NowImpl) || (toParse instanceof PromiseImpl);
}

class NowImpl<T> implements Asap<T>{
    public readonly type: AsapType = AsapType.NOW;

    constructor(
        private readonly rawValue: T
    ) {}

    consume (consumer: IConsumer<T>): void{
        consumer(this.rawValue);
    }

    map<Z>(mapper: IFunction<T, Z>): Asap<Z> {
        return Asaps.now(mapper(this.rawValue));
    }

    ifPromise(ifPromise: IConsumer<Promise<T>>, _else?: IConsumer<T>): void {
        if (_else){
            _else(this.rawValue);
        }
    }

    assertNow(): T {
        return this.rawValue;
    }
}

class PromiseImpl<T> implements Asap<T> {
    public readonly type: AsapType = AsapType.LATER;

    constructor(
        private readonly promise: Promise<T>
    ) {}

    consume(consumer: IConsumer<T>): void {
        this.promise.then(consumer);
    }

    map<Z>(mapper: IFunction<T, Z>): Asap<Z> {
        return Asaps.later(new Promise ((done)=>
            this.promise.then(value=> done(mapper(value)))
        ));
    }

    ifPromise(ifPromise: IConsumer<Promise<T>>, _else?: IConsumer<T>): void {
        ifPromise(this.promise);
    }

    assertNow(): T {
        throw new Error(`you are asserting that this ASAP can be resolved now, but it can't. try calling consume or checking the type`);
    }
}

export class AsapParser {
    static from<T> (toParse: AsapLike<T>): Asap<T> {
        return isAsapAlready(toParse) ?
            toParse :
            isPromise(toParse) ?
                new PromiseImpl<T> (toParse) :
                new NowImpl(toParse);
    }
}

export class Asaps {
    static now<T> (value: T): Asap<T>{
        return AsapParser.from(value);
    }

    static later<T> (promise: Promise<T>): Asap<T> {
        return AsapParser.from(promise);
    }

    static delayed<T> (value: T, ms: number): Asap<T> {
        return Asaps.later(new Promise ((done)=>setTimeout(()=> done(value), ms)));
    }
}
