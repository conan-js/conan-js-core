import {IConsumer} from "../conan-utils/typesHelper";

export class Asap<T> {
    static now <T>(value: T): Asap<T> {
        return new Asap<T>(value, null);
    }

    static wrapAsNextTick <T>(from: Asap<T>): Asap<T> {
        if (from.now) {
            return Asap.nextTick<T>(from.now);
        }

        return from;
    }

    static nextTick <T>(value: T): Asap<T> {
        return new Asap<T>(null, new Promise<T>(endpoint => endpoint(value)));
    }

    constructor(
        private readonly now: T,
        private readonly nextTick: Promise<T>
    ) {}

    asap (consumer: IConsumer<T>): this{
        if (this.now){
            consumer(this.now);
        } else {
            this.nextTick.then(consumer);
        }


        return this;
    }
}
