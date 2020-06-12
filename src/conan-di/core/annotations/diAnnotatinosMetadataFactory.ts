import {DiUtils} from '../diUtils';
import {DiMetadata, DiParamMetadata, DiRawAnnotationsMetadata} from './diAnnotationsDomain';
import {diAnnotationsCrud} from './diAnnotations';
import {Functions} from "../../../conan-utils/functions";
import {IKeyValuePairs} from "../../../conan-utils/typesHelper";
import {Injectable} from "../diDomain";

export class DiAnnotationsMetadataFactory {
    create (from: Injectable<any>): DiMetadata {
        let dependencyName = DiUtils.beanName(from);
        let argumentNames = Functions.extractArgNames(from);
        let diParams: IKeyValuePairs<DiParamMetadata> = {};

        let annotationsMetaData: DiRawAnnotationsMetadata | null= diAnnotationsCrud.getAnnotationsMetaData(from);
        if (annotationsMetaData) {
            annotationsMetaData.diAnnotations.forEach(it => {
                let argumentName: string = argumentNames[it.onConstructorParamIndex];
                diParams [argumentName] = {
                    name: argumentName,
                    type: it.type,
                    payload: it.injectable,
                    propsProvider: it.cascadeProperties
                };
            });
        }

        return {
            dependencyName: dependencyName,
            argumentNames: argumentNames,
            diParams: diParams,
            constructor: from
        };
    }
}
