import {DiRuntime} from './diRuntime';
import {DiInvocationResolver} from './diInvocationResolver';
import {DiInvocationBuilderFactory, DiInvocationFactory} from './diInvocationBuilder';
import {DiAnnotationsMetadataFactory} from './annotations/diAnnotatinosMetadataFactory';
import {DiMetadata} from './annotations/diAnnotationsDomain';
import {KeyValueCache} from "../../conan-utils/keyValueCache";
import {IBiFunction, IProducer} from "../../conan-utils/typesHelper";

export class DiRuntimeFactory {
    static readonly DI_INVOCATION_BUILDER_FACTORY = new DiInvocationBuilderFactory(new DiAnnotationsMetadataFactory());
    static readonly cacheTBR: IProducer<KeyValueCache> = () =>new KeyValueCache();
    static readonly DI_INVOCATION_RESOLVER_PROVIDER = (cache: KeyValueCache, diReducer: IBiFunction<DiMetadata, any, any> | null) => new DiInvocationResolver(
        new DiInvocationFactory(
            DiRuntimeFactory.DI_INVOCATION_BUILDER_FACTORY
        ),
        DiRuntimeFactory.cacheTBR (),
        diReducer
    );

    static create (diReducer?: IBiFunction<DiMetadata, any, any>): DiRuntime {
        return new DiRuntime(
            DiRuntimeFactory.DI_INVOCATION_RESOLVER_PROVIDER (new KeyValueCache(), diReducer ? diReducer : null),
            DiRuntimeFactory.DI_INVOCATION_BUILDER_FACTORY
        );
    }
}
