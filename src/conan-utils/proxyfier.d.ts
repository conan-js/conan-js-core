import { IBiFunction, IKeyValuePairs, IProducer } from "./typesHelper";
export interface FunctionMetadata {
    methodName: string;
    payload: any;
}
export declare class Proxyfier {
    static proxy<T extends IKeyValuePairs<any>>(from: any, enricher: IBiFunction<IProducer<any>, FunctionMetadata, any>): T;
}
