import {IBiFunction, IKeyValuePairs, IProducer} from "./typesHelper";

export interface FunctionMetadata {
    methodName: string,
    payload: any
}

export class Proxyfier {
    static proxy<T extends IKeyValuePairs<any>> (from: any, enricher: IBiFunction<IProducer<any>, FunctionMetadata, any>): T {
        let proxy: any = {} as any;
        let prototype = Object.getPrototypeOf(from);
        let methodHost = prototype.constructor.name === 'Object' ? from : prototype;
        let ownPropertyNames = Object.getOwnPropertyNames(methodHost);
        ownPropertyNames.forEach(key => {
            if (key === 'constructor') return;
            let toProxy = (methodHost as any)[key];
            if (typeof toProxy !== 'function') return;

            (proxy as any)[key] = (...payload: any) => {
                let originalCall = ()=>(from as any)[key](...payload);
                return enricher(originalCall, {
                    methodName: key,
                    payload
                })
            }
        });
        return proxy;

    }
}
