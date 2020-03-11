import {IBiConsumer, IConstructor, IFunction} from "../conan-utils/typesHelper";

export interface Stage<NAME extends string = string, REQUIREMENTS = void> {
    nextState: NAME;
    data?: REQUIREMENTS;
}

export type StageLogic<ACTIONS, DATA = void> = IConstructor<ACTIONS, any> | IFunction<DATA, ACTIONS>;

export interface StageDef<
    NAME extends string,
    ACTIONS,
    STAGE extends Stage<NAME, REQUIREMENTS>,
    REQUIREMENTS = void
> {
    readonly name: NAME;
    readonly logic: StageLogic<ACTIONS, REQUIREMENTS>;
    readonly deferredInfo?: DeferredInfo<ACTIONS, REQUIREMENTS>;
}

export interface DeferredInfo<
    ACTIONS,
    REQUIREMENTS = void
> {
    readonly deferrer?: IBiConsumer<ACTIONS, REQUIREMENTS>;
    readonly joinsInto: string[];
}

export class StageLogicParser {
    static parse<ACTIONS, DATA = void> (toParse: StageLogic<ACTIONS, DATA>): IFunction<DATA, ACTIONS> {
        if (StageLogicParser.isConstructorType<ACTIONS, DATA>(toParse)) {
            return (data) => new toParse (data);
        }

        return toParse;
    }

    static isConstructorType<ACTIONS, DATA> (toTransform: StageLogic<ACTIONS, DATA>): toTransform is IConstructor<ACTIONS, any> {
        return (StageLogicParser.isConstructor(toTransform));
    }


    static isConstructor(obj: object): boolean {
        // @ts-ignore
        return !!obj.prototype && !!obj.prototype.constructor.name;
    }
}
