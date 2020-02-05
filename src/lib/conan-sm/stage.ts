import {IBiConsumer, IConstructor} from "../conan-utils/typesHelper";

export interface Stage<NAME extends string, ACTIONS, REQUIREMENTS = void> {
    name: NAME;
    requirements?: REQUIREMENTS;
}

export interface StageDef<
    NAME extends string,
    ACTIONS,
    STAGE extends Stage<NAME, ACTIONS, REQUIREMENTS>,
    REQUIREMENTS = void
> {
    readonly name: NAME;
    readonly logic: IConstructor<ACTIONS, REQUIREMENTS>;
    readonly deferrer?: IBiConsumer<ACTIONS, REQUIREMENTS>;
}
