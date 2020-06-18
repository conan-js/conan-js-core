import {IBiConsumer, IFunction, IKeyValuePairs, IPredicate} from "./typesHelper";
import {StatusDef} from "../conan-flow/def/status/statusDef";

export class Objects {
    public static mapKeys<
        VALUE_TYPE,
        FINAL_VALUE_TYPE = VALUE_TYPE
    >(from: IKeyValuePairs<any>, valueMapper: IFunction<VALUE_TYPE, FINAL_VALUE_TYPE>, keyMapper?: IPredicate<string>) : IKeyValuePairs<FINAL_VALUE_TYPE> {
        let result: IKeyValuePairs<any> = {};
        Object.keys(from).forEach(key=>{
            let newKey = keyMapper ? keyMapper(key) : key;
            result [newKey] = valueMapper(from[key])
        });

        return result;
    }

    public static foreachEntry<DATA_TYPE> (from: {[p: string]: DATA_TYPE}, cb: IBiConsumer<DATA_TYPE, string>) {
        Object.keys(from).forEach(key=>{
            cb(from[key], key as any)
        })
    }


    public static keyfy<
        ARRAY_TYPE,
    > (from: ARRAY_TYPE[], keyProvider: IFunction<ARRAY_TYPE, string>): IKeyValuePairs<ARRAY_TYPE>{
        return from.reduce<IKeyValuePairs<ARRAY_TYPE>>((acc, it)=> {
            return {
                ...acc,
                [keyProvider(it)]: it
            };
        }, {} as IKeyValuePairs<ARRAY_TYPE>);
    }

    public static navigate<
        START,
    > (from: START, iterator: IFunction<START, START | null>): START[] {
        let result : START[] = [];
        let next = from;
        while (next) {
            next = iterator(next);
            if (next !== null) {
                result.push(next);
            }
        }


        return result;
    }

    public static deepEqualsArrays<T extends { }> (left: T[], right: T[]): boolean {
        if (left.length !== right.length) return false;

        for (let leftItem of left) {
            if (right.indexOf(leftItem) === -1) return false;
        }

        return true;
    }

    public static deepEqualsObjects<T extends { }> (left: T, right: T): boolean {
        for (let key of Object.keys(left)) {
            if (!Objects.deepEquals(left[key], right[key])){
                return false;
            }
        }
        return true;
    }

    public static deepEquals<T> (left: T, right: T): boolean {
        if ((left == null) && (right == null)) return true;
        if ((left == null) && (right != null)) return false;
        if ((left != null) && (right == null)) return false;

        if ( (typeof left === "string") && (typeof right === "string")) return left === right;
        if ( (typeof left === "number") && (typeof right === "number")) return left === right;
        if ( (typeof left === "function") && (typeof right === "function")) return left === right;
        if ( (typeof left === "boolean") && (typeof right === "boolean")) return left === right;
        if ( (typeof left === "undefined") && (typeof right === "undefined")) return left === right;

        if (Array.isArray(left) && (Array.isArray(right))) return Objects.deepEqualsArrays(left, right);
        if (Array.isArray(left) && (!Array.isArray(right))) return false;
        if (!Array.isArray(left) && (Array.isArray(right))) return false;

        if ( (typeof left === "object") && (typeof right === "object")) return Objects.deepEqualsObjects(left, right);
        return left === right;
    }
}
