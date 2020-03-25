import {DiUtils} from '../diUtils';
import {DiParamMetadata, DiRawAnnotationsMetadata, DiMetadata} from './diAnnotationsDomain';
import {diAnnotationsCrud} from './diAnnotations';
import {Functions} from "../../../conan-utils/functions";
import {IKeyValuePairs, IVarArgConstructor} from "../../../conan-utils/typesHelper";

export class DiAnnotationsMetadataFactory {
    create (from: IVarArgConstructor<any>): DiMetadata {
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
