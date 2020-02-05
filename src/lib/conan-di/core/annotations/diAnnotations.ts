import {DiRawAnnotationsMetadata, InjectableType} from './diAnnotationsDomain';
import {MetadataCrudUtils} from "../../../conan-utils/anotationsCrudUtils";
import {IProducer, IVarArgConstructor} from "../../../conan-utils/typesHelper";

export let diAnnotationsCrud = new MetadataCrudUtils<DiRawAnnotationsMetadata>('$di', (): DiRawAnnotationsMetadata => ({
    diAnnotations: []
}));

export function InjectByType<P>(constructor: IVarArgConstructor<any>, propsProvider?: IProducer<P>): Function {
    return (classConstructor: any, keyOfParam_alwaysIgnore: string, index: number) => {
        diAnnotationsCrud.updateMetadata(classConstructor, (current: DiRawAnnotationsMetadata) => current.diAnnotations.push({
            onConstructorParamIndex: index,
            injectable: constructor,
            type: InjectableType.TYPE,
            cascadeProperties: propsProvider
        }));
    };
}

export function InjectDynamic<P>(constructorProvider: IProducer<IVarArgConstructor<any>>, propsProvider?: IProducer<P>): Function {
    return (classConstructor: any, keyOfParam_alwaysIgnore: string, index: number) => {
        diAnnotationsCrud.updateMetadata(classConstructor, (current: DiRawAnnotationsMetadata) => current.diAnnotations.push({
            onConstructorParamIndex: index,
            injectable: constructorProvider,
            type: InjectableType.DYNAMIC,
            cascadeProperties: propsProvider
        }));
    };
}

export function InjectByName<P>(name: string, propsProvider?: IProducer<P>): Function {
    console.log('Inject by name', name);
    return (classConstructor: any, keyOfParam_alwaysIgnore: string, index: number) => {
        diAnnotationsCrud.updateMetadata(classConstructor, (current: DiRawAnnotationsMetadata) => current.diAnnotations.push({
            onConstructorParamIndex: index,
            injectable: name,
            type: InjectableType.NAME,
            cascadeProperties: propsProvider
        }));
    };

}

