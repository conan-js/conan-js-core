import {IKeyValuePairs, IProducer, IVarArgConstructor} from "../../../conan-utils/typesHelper";

export type Injectable = IProducer<IVarArgConstructor<any>> | string | IVarArgConstructor<any>;

export enum InjectableType {
    DYNAMIC = 'dynamic',
    NAME = 'name',
    TYPE = 'type'
}

export interface DiRawAnnotationMetadata<P> {
    onConstructorParamIndex: number;
    injectable: Injectable;
    type: InjectableType;
    cascadeProperties: IProducer<P> | undefined;
}

export interface DiRawAnnotationsMetadata {
    diAnnotations: DiRawAnnotationMetadata<any>[];
}

export interface DiParamMetadata {
    name: string;
    type: InjectableType;
    payload: Injectable;
    propsProvider: IProducer<any> | undefined | null;
}

export interface DiMetadata {
    dependencyName: string;
    argumentNames: string[];
    diParams: IKeyValuePairs <DiParamMetadata>;
    constructor: IVarArgConstructor<any>;
}

