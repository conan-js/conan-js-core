import {IBiConsumer, ICallback, IConsumer, IFunction} from "./typesHelper";
import {Flow} from "../conan-flow/domain/flow";
import {Flows} from "../conan-flow/factories/flows";
import {FlowEventNature} from "../conan-flow/domain/flowRuntimeEvents";
import {Strings} from "./strings";

export enum AsapType {
    NOW = 'NOW',
    LATER = 'LATER',
}

export type AsapLike<T> = Promise<T> | T | Asap<T>;

export interface Asap<T> {
    catch(error: IConsumer<Error>): this;

    then(consumer: IConsumer<T>): this;

    onCancel(consumer: ICallback): this;

    map<Z>(mapper: IFunction<T, Z>): Asap<Z>;

    merge<Z>(mapper: IFunction<T, Asap<Z>>): Asap<Z>;

    type: AsapType;

    cancel(): boolean;
}

function isPromise<T>(toParse: AsapLike<T>): toParse is Promise<T> {
    if (toParse == null) return false;
    if (typeof toParse != "object") return false;

    return ('then' in toParse) && typeof (toParse.then) === 'function'
}

export function isAsap<T>(toParse: AsapLike<T>): toParse is Asap<T> {
    return (toParse instanceof NowImpl) || (toParse instanceof LaterImpl);
}

class NowImpl<T> implements Asap<T> {
    public readonly type: AsapType = AsapType.NOW;

    constructor(
        private readonly rawValue: T
    ) {
    }

    cancel(): boolean {
        return false;
    }

    then(consumer: IConsumer<T>): this {
        consumer(this.rawValue);
        return this;
    }

    map<Z>(mapper: IFunction<T, Z>): Asap<Z> {
        return Asaps.now(mapper(this.rawValue));
    }

    merge<Z>(mapper: IFunction<T, Asap<Z>>): Asap<Z> {
        const [next, asap] = Asaps.next<Z>('map', FlowEventNature.AUX);
        this.then(value =>
            mapper(value).then(toMerge => next(toMerge))
        )
        return asap;
    }

    catch(error: IConsumer<any>): this {
        //Since is not async, it would never fail
        return this;
    }

    onCancel(consumer: ICallback): this {
        //Since is not async, it would never cancel
        return this;
    }
}

interface ResolvingData<T> {
    then: IConsumer<T>[];
    catch: IBiConsumer<Error, T>[];
    onCancel: ICallback[];
}

interface LaterAsapFlow<T> {
    resolving: ResolvingData<T>;
    resolved: T;
    errored: T;
    cancelled: void;
}

class LaterImpl<T> implements Asap<T> {
    type: AsapType = AsapType.LATER;

    constructor(
        private readonly flow: Flow<LaterAsapFlow<T>>
    ) {
    }

    map<Z>(mapper: IFunction<T, Z>): Asap<Z> {
        let [setNext, nextAsap] = Asaps.next<Z>('map', FlowEventNature.AUX);
        this.then(value => setNext(mapper(value)));
        this.onCancel(() => nextAsap.cancel());
        return nextAsap;
    }

    then(consumer: IConsumer<T>): this {
        if (this.flow.getCurrentStatusName() === 'resolved') {
            consumer(this.flow.on('resolved').getLastData());
        } else {
            this.flow.on('resolving').steps.$update((current) => ({
                ...current,
                then: [...current.then, consumer],
            }));
        }
        return this;
    }

    resolve(value: T): void {
        if (this.flow.getCurrentStatusName() === 'cancelled') return;

        try {
            this.flow.assertOn<'resolving'>('resolving', (onResolving) => {
                onResolving.getData().then.forEach(subscriber => {
                    subscriber(value)
                });
                this.flow.on('resolving').transitions.$toStatus({
                    name: "resolved",
                    data: value
                });
            })
        } catch (e) {
            console.error(e);
            this.flow.assertOn<'resolving'>('resolving', (onResolving) => {
                onResolving.getData().catch.forEach(subscriber => {
                    subscriber(e, value)
                })
                onResolving.do.$toStatus({name: "errored", data: value})
            })
        }
    }

    onCancel(consumer: ICallback): this {
        if (this.flow.getCurrentStatusName() === 'cancelled') {
            consumer();
            return;
        }

        if (this.flow.getCurrentStatusName() === 'resolving') {
            this.flow.on('resolving').steps.$update((current) => ({
                ...current,
                onCancel: [...current.onCancel, consumer],
            }));
        }
        return this;

    }

    cancel(): boolean {
        if (this.flow.getCurrentStatusName() !== 'resolving') {
            return false;
        }

        this.flow.assertOn('resolving', onResolving => {
            onResolving.getData().onCancel.forEach(subscriber => {
                subscriber()
            });
            this.flow.on('resolving').transitions.$toStatus({name: "cancelled",});
        })

        return true;

    }

    merge<Z>(mapper: IFunction<T, Asap<Z>>): Asap<Z> {
        const [next, asap] = Asaps.next<Z>('merge', FlowEventNature.AUX);
        this.then(value =>
            mapper(value)
                .then(toMerge => next(toMerge))
                .onCancel(() => asap.cancel())
        ).onCancel(() => asap.cancel());

        return asap;
    }

    catch(consumer: IBiConsumer<Error, T>): this {
        if (this.flow.getCurrentStatusName() === 'resolving') {
            this.flow.on('resolving').steps.$update((current) => ({
                ...current,
                catch: [...current.catch, consumer],
            }));
        }
        return this;
    }

}

export class AsapParser {
    static from<T>(toParse: AsapLike<T>): Asap<T> {
        return isAsap(toParse) ?
            toParse :
            isPromise(toParse) ?
                Asaps.fromPromise(toParse) :
                Asaps.now(toParse);
    }
}

export class Asaps {
    static now<T>(value: T): Asap<T> {
        return new NowImpl(value);
    }

    static fromPromise<T>(promise: Promise<T>, name?: string): Asap<T> {
        let promiseImpl: LaterImpl<T> = new LaterImpl<T>(Flows.createController<LaterAsapFlow<T>>({
            name: `future[${name? name: 'anonymous'}]`,
            statuses: {
                resolving: {},
                resolved: {},
                errored: {},
                cancelled: {}
            },
            initialStatus: {
                name: 'resolving',
                data: {
                    then: [],
                    catch: [],
                    onCancel: [],
                }
            },
            nature: FlowEventNature.ASAP
        }).start());

        promise.then(value => promiseImpl.resolve(value));
        promise.catch(e => promiseImpl.catch(e) as any);

        return promiseImpl;
    }

    static delayed<T>(value: T, ms: number, name?: string): Asap<T> {
        return Asaps.fromPromise(new Promise((done) => setTimeout(() => done(value), ms)), `delay[${name? name: 'anonymous'}]`);
    }

    static fetch<T>(url: string): Asap<T> {
        return Asaps.fromPromise(new Promise<T>((done) => {
            fetch(url)
                .then((resp) => resp.json()) // Transform the data into json
                .then(function (data: T) {
                    done(data)
                })
        }),
            `fetch[${Strings.padEnd(url, 15)}]`
        )
    }

    static next<T>(name?: string, nature?: FlowEventNature): [IConsumer<T>, Asap<T>] {
        let laterImpl: LaterImpl<T> = new LaterImpl<T>(Flows.createController<LaterAsapFlow<T>>({
            name: `asap-${name ? name : 'anonymous'}`,
            statuses: {
                resolving: {},
                resolved: {},
                errored: {},
                cancelled: {}
            },
            initialStatus: {
                name: 'resolving',
                data: {
                    then: [],
                    catch: [],
                    onCancel: []
                }
            },
            nature: nature ? nature : FlowEventNature.ASAP
        }).start());
        return [(value) => laterImpl.resolve(value), laterImpl];
    }

}
