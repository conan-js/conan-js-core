import {DiContextDef} from "./diDomain";
import {DiRuntimeFactory} from "./diRuntimeFactory";
import {IVarArgConstructor} from "../../conan-utils/typesHelper";

export class DiContextFactory {
    static createContext <T> (contextDef: DiContextDef<T>): T{
        let diRuntime = DiRuntimeFactory.create();
        let keys = Object.keys(contextDef) as (keyof T) [];
        let result: Partial<T> = {};
        (keys).forEach(key=>{
            let constr: IVarArgConstructor<any> = contextDef[key];
            result[key] = diRuntime.invoke(constr, result);
        });
        return result as T;
    }
}
