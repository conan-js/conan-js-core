import {DiInvocation, Injectable} from './diDomain';
import {DiAnnotationsMetadataFactory} from './annotations/diAnnotatinosMetadataFactory';
import {IConsumer, IKeyValuePairs, IProducer, IVarArgConstructor} from "../../conan-utils/typesHelper";

export class DiInvocationBuilderFactory {
    constructor(
        private readonly diAnnotationsMetadataFactory: DiAnnotationsMetadataFactory
    ) {}


    childrenOf<T, P> (parent: DiInvocation<any>, from: IVarArgConstructor<T>, propsProvider ?: IProducer<P> | null): DiInvocationBuilder<T, P> {
        let newBranch: string[] = parent.inProcessDiInvocations.slice(0);
        newBranch.push(parent.diMetadata.dependencyName);
        return new DiInvocationBuilder<T, P>(this.diAnnotationsMetadataFactory, from)
            .withInProcessDiInvocations(newBranch)
            .withTransitiveBeans(parent.transitiveBeans)
            // @ts-ignore
            .if(propsProvider != null, (it) => it.withProperties(propsProvider()));
    }

    root<T, P>(from: Injectable<T>): DiInvocationBuilder<T, P> {
        return new DiInvocationBuilder<T, P>(this.diAnnotationsMetadataFactory, from);
    }
}

export class DiInvocationFactory {
    constructor(
        private readonly diInvocationBuilderFactory: DiInvocationBuilderFactory
    ) {}

    childrenOf<T> (parent: DiInvocation<any>, from: IVarArgConstructor<T>, propsProvider ?: IProducer<T> | null): DiInvocation<T> {
        return this.diInvocationBuilderFactory.childrenOf(parent, from, propsProvider).build();
    }
}

export class DiInvocationBuilder<T, P> {
    inProcessDiInvocations: string[] = [];
    transitiveBeans: IKeyValuePairs<any> | undefined= {};
    properties: P | null = null;

    constructor(
        private readonly diAnnotationsMetadataFactory: DiAnnotationsMetadataFactory,
        private readonly _constructor: Injectable<any>,
    ) {}

    if (condition: boolean, cb: IConsumer<DiInvocationBuilder<T, P>>): DiInvocationBuilder<T, P> {
        if (condition) {
            cb (this);
        }
        return this;
    }

    withInProcessDiInvocations (inProcessDiInvocations: string[]): DiInvocationBuilder<T, P> {
        this.inProcessDiInvocations = inProcessDiInvocations;
        return this;
    }

    withTransitiveBeans (transitiveBeans: IKeyValuePairs<any> | undefined): DiInvocationBuilder<T, P> {
        this.transitiveBeans = transitiveBeans;
        return this;
    }

    withProperties(properties: P): DiInvocationBuilder<T, P> {
        this.properties = properties;
        return this;
    }

    build (): DiInvocation<P> {
        return {
            diMetadata: this.diAnnotationsMetadataFactory.create(this._constructor),
            inProcessDiInvocations: this.inProcessDiInvocations,
            transitiveBeans: this.transitiveBeans,
            properties: this.properties
        };
    }
}
