import {IBiConsumer, IConstructor} from "../conan-utils/typesHelper";

export interface Stage<NAME extends string = string, REQUIREMENTS = void> {
    name: NAME;
    requirements?: REQUIREMENTS;
}

export interface StageDef<
    NAME extends string,
    ACTIONS,
    STAGE extends Stage<NAME, REQUIREMENTS>,
    REQUIREMENTS = void
> {
    readonly name: NAME;
    readonly logic: IConstructor<ACTIONS, REQUIREMENTS>;
    readonly deferredInfo?: DeferredInfo<ACTIONS, REQUIREMENTS>;
}

export interface DeferredInfo<
    ACTIONS,
    REQUIREMENTS = void
> {
    readonly deferrer?: IBiConsumer<ACTIONS, REQUIREMENTS>;
    readonly joinsInto: string[];
}
