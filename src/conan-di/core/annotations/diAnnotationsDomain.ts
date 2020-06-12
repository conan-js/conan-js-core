import {IKeyValuePairs, IProducer, IVarArgConstructor} from "../../../conan-utils/typesHelper";
import {Injectable} from "../diDomain";

export type InjectableResult = IProducer<IVarArgConstructor<any>> | string | IVarArgConstructor<any>;

export enum InjectableType {
    DYNAMIC = 'dynamic',
    NAME = 'name',
    TYPE = 'type'
}

export interface DiRawAnnotationMetadata<P> {
    onConstructorParamIndex: number;
    injectable: InjectableResult;
    type: InjectableType;
    cascadeProperties: IProducer<P> | undefined;
}

export interface DiRawAnnotationsMetadata {
    diAnnotations: DiRawAnnotationMetadata<any>[];
}

export interface DiParamMetadata {
    name: string;
    type: InjectableType;
    payload: InjectableResult;
    propsProvider: IProducer<any> | undefined | null;
}

export interface DiMetadata {
    dependencyName: string;
    argumentNames: string[];
    diParams: IKeyValuePairs <DiParamMetadata>;
    constructor: Injectable<any>;
}

