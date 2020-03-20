import {IBiConsumer, IConstructor, IFunction} from "../conan-utils/typesHelper";

export interface State<NAME extends string = string, REQUIREMENTS = void> {
    name: NAME;
    data?: REQUIREMENTS;
}

export type StateLogic<ACTIONS, DATA = void> = IConstructor<ACTIONS, any> | IFunction<DATA, ACTIONS>;

export interface StateDef<
    NAME extends string,
    ACTIONS,
    STAGE extends State<NAME, REQUIREMENTS>,
    REQUIREMENTS = void
> {
    readonly name: NAME;
    readonly logic: StateLogic<ACTIONS, REQUIREMENTS>;
    readonly deferredInfo?: DeferredInfo<ACTIONS, REQUIREMENTS>;
}

export interface DeferredInfo<
    ACTIONS,
    REQUIREMENTS = void
> {
    readonly deferrer?: IBiConsumer<ACTIONS, REQUIREMENTS>;
    readonly joinsInto: string[];
}

export class StateLogicParser {
    static parse<ACTIONS, DATA = void> (toParse: StateLogic<ACTIONS, DATA>): IFunction<DATA, ACTIONS> {
        if (StateLogicParser.isConstructorType<ACTIONS, DATA>(toParse)) {
            return (data) => new toParse (data);
        }

        return toParse;
    }

    static isConstructorType<ACTIONS, DATA> (toTransform: StateLogic<ACTIONS, DATA>): toTransform is IConstructor<ACTIONS, any> {
        return (StateLogicParser.isConstructor(toTransform));
    }


    static isConstructor(obj: object): boolean {
        // @ts-ignore
        return !!obj.prototype && !!obj.prototype.constructor.name;
    }
}
