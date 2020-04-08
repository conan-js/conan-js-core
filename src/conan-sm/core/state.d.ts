import { IBiConsumer, IConstructor, IFunction } from "../../conan-utils/typesHelper";
export interface State<NAME extends string = string, REQUIREMENTS = void> {
    name: NAME;
    data?: REQUIREMENTS;
}
export declare type StateLogic<ACTIONS, DATA = void> = IConstructor<ACTIONS, any> | IFunction<DATA, ACTIONS>;
export interface StateDef<NAME extends string, ACTIONS, STAGE extends State<NAME, REQUIREMENTS>, REQUIREMENTS = void> {
    readonly name: NAME;
    readonly logic: StateLogic<ACTIONS, REQUIREMENTS>;
    readonly deferredInfo?: DeferredInfo<ACTIONS, REQUIREMENTS>;
}
export interface DeferredInfo<ACTIONS, REQUIREMENTS = void> {
    readonly deferrer?: IBiConsumer<ACTIONS, REQUIREMENTS>;
    readonly joinsInto: string[];
}
export declare class StateLogicParser {
    static parse<ACTIONS, DATA = void>(toParse: StateLogic<ACTIONS, DATA>): IFunction<DATA, ACTIONS>;
    static isConstructorType<ACTIONS, DATA>(toTransform: StateLogic<ACTIONS, DATA>): toTransform is IConstructor<ACTIONS, any>;
    static isConstructor(obj: object): boolean;
}
