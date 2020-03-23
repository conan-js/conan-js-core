import {IKeyValuePairs, IProducer} from "./typesHelper";

export class KeyValueCache {
    private cache: IKeyValuePairs<any> = {};

    resolve <T> (key: string, producer: IProducer<T> | null): T {
        if (this.cache[key]) {
            return this.cache[key];
        }

        if (producer == null) throw Error (`Can't resolve cache`);

        let bean = producer();
        this.cache[key] = bean;
        return bean;
    }
}
