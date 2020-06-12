import {DiContextDef, Injectable} from "./diDomain";
import {DiRuntimeFactory} from "./diRuntimeFactory";
import {IKeyValuePairs, IVarArgConstructor} from "../../conan-utils/typesHelper";

export class DiContextFactory {
    static createContext <T, AUX  = void> (contextDef: DiContextDef<T>, aux?: DiContextDef<AUX>): T & AUX{
        let diRuntime = DiRuntimeFactory.create();

        let from: DiContextDef<T & AUX> = {
            ...contextDef,
            ...aux
        } as any;
        let keys: (keyof T & AUX)[];
        if (aux){
            keys = [...Object.keys(contextDef), ...Object.keys(aux)] as (keyof T & AUX) [];
        }else{
            keys = Object.keys(contextDef) as any;
        }
        let result: Partial<T & AUX> = {};
        let context: IKeyValuePairs<Injectable<any>> = {
            ...contextDef,
            ...aux
        };
        (keys).forEach(key=>{
            let constr: Injectable<any> = from[key];
            result[key] = diRuntime.invoke(constr, result, context);
        });
        return result as T & AUX;
    }
}
