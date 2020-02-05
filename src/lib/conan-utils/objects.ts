import {IBiConsumer, IFunction, IKeyValuePairs, IPredicate} from "./typesHelper";

export class Objects {
    public static mapKeys<
        RESULT extends IKeyValuePairs<FINAL_VALUE_TYPE>,
        VALUE_TYPE,
        FINAL_VALUE_TYPE = VALUE_TYPE
    >(from: IKeyValuePairs<any>, valueMapper: IFunction<VALUE_TYPE, FINAL_VALUE_TYPE>, keyMapper?: IPredicate<string>) : RESULT {
        let result: IKeyValuePairs<any> = {};
        Object.keys(from).forEach(key=>{
            let newKey = keyMapper ? keyMapper(key) : key;
            result [newKey] = valueMapper(from[key])
        });

        return result as RESULT;
    }

    public static foreachEntry<T> (from: IKeyValuePairs<T>, cb: IBiConsumer<T, string>) {
        Object.keys(from).forEach(key=>{
            cb(from[key], key)
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
}
