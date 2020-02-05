import {DiMetadata, DiParamMetadata, InjectableType} from './annotations/diAnnotationsDomain';
import {DiRuntime} from './diRuntime';
import {DiInvocation, InvocationResult} from './diDomain';
import {DiInvocationFactory} from './diInvocationBuilder';
import {KeyValueCache} from "../../conan-utils/keyValueCache";
import {IBiFunction, IKeyValuePairs, IProducer, IVarArgConstructor} from "../../conan-utils/typesHelper";

export class DiInvocationResolver {
    constructor(
        private readonly diInvocationFactory: DiInvocationFactory,
        private readonly diCache: KeyValueCache,
        private readonly diEnricher: IBiFunction<DiMetadata, any, any> | null
    ) {}

    resolve<T, P>(invocation: DiInvocation<P>): InvocationResult<T> {
        if (this.causesCircularDependency(invocation)) {
            return {
                circularDependencyEndOf: invocation.diMetadata.dependencyName,
                result: null,
                pendingDependencies: {}
            };
        }

        // @ts-ignore
        let freshInvocationResult: InvocationResult<T> = null;

        let bean: T = this.diCache.resolve<T>(
            invocation.diMetadata.dependencyName,
            (): T => {
                freshInvocationResult = this.doCreate<T, P>(invocation);
                if (this.diEnricher) {
                    freshInvocationResult.result = this.diEnricher(invocation.diMetadata, freshInvocationResult.result);
                }
                if (Object.keys(freshInvocationResult.pendingDependencies).indexOf(invocation.diMetadata.dependencyName) > -1) {
                    freshInvocationResult.pendingDependencies[invocation.diMetadata.dependencyName].forEach(childDependency => {
                        (<any>this.diCache.resolve(childDependency, null)) [invocation.diMetadata.dependencyName] = freshInvocationResult.result;
                    });
                }
                return <T>freshInvocationResult.result;
            }
        );

        return freshInvocationResult == null ? {
            result: bean,
            pendingDependencies: {}
        } : freshInvocationResult;
    }

    private causesCircularDependency<P>(invocation: DiInvocation<P>) {
        return invocation.inProcessDiInvocations.indexOf(invocation.diMetadata.dependencyName) > -1;
    }

    private doCreate<T, P>(invocation: DiInvocation<P>): InvocationResult<T> {
        if (invocation.diMetadata.argumentNames.length === 0) {
            return {
                result: new (<any>invocation.diMetadata.constructor)(),
                pendingDependencies: {}
            };
        }

        let childrenInvocationResults: InvocationResult<any>[] = this.invokeChildren(invocation);
        let params: any[] = [];
        let startsCircularDependencies: IKeyValuePairs<string[]> = {};

        childrenInvocationResults.forEach(child => {
            params.push(child.result);
            if (child.circularDependencyEndOf != null) {
                DiInvocationResolver.addValueToKeyValuePairs(startsCircularDependencies, child.circularDependencyEndOf, invocation.diMetadata.dependencyName);
            }

            if (child.pendingDependencies) {
                Object.keys(child.pendingDependencies).forEach(key => {
                    DiInvocationResolver.addValuesToKeyValuePairs(startsCircularDependencies, key, child.pendingDependencies [key]);
                });
            }
        });

        return {
            result: new (<any>invocation.diMetadata.constructor)(...params),
            pendingDependencies: startsCircularDependencies
        };
    }


    private static addValueToKeyValuePairs<T>(keyValuePairs: IKeyValuePairs<T[]>, key: string, value: T) {
        if (!keyValuePairs [key]) {
            keyValuePairs [key] = [];
        }

        if (keyValuePairs [key].indexOf(value) > -1) return;
        keyValuePairs [key].push(value);
    }

    private static addValuesToKeyValuePairs<T>(keyValuePairs: IKeyValuePairs<T[]>, key: string, values: T[]) {
        if (!keyValuePairs [key]) {
            keyValuePairs [key] = values;
            return;
        }

        values.forEach(value => DiInvocationResolver.addValueToKeyValuePairs(keyValuePairs, key, value));
    }


    private invokeChildren<P>(invocation: DiInvocation<P>): InvocationResult<any> [] {
        let
            params: InvocationResult<any>[] = [];

        invocation
            .diMetadata
            .argumentNames
            .forEach(argumentName => {
                    let resolvedParam = this.resolveParamDef<P>(invocation, argumentName);
                    params.push(
                        this.invokeChild(invocation, resolvedParam)
                    );
                }
            );

        return params;
    }

    private resolveParamDef<P>(invocation: DiInvocation<P>, argumentName: string): DiParamMetadata {
        let fromAnnotation = invocation.diMetadata.diParams[argumentName];

        if (fromAnnotation == null) {
            return {
                name: argumentName,
                propsProvider: null,
                payload: argumentName,
                type: InjectableType.NAME
            };
        }
        return fromAnnotation;
    }

    private invokeChild<P>(invocation: DiInvocation<P>, resolvedParam: DiParamMetadata): InvocationResult<any> {
        if (resolvedParam.name === DiRuntime.PROPS_PROPERTY_NAME) {
            return this.resolveChildProps(invocation);
        }

        if (resolvedParam.type === InjectableType.TYPE) {
            return this.resolveChildByType(invocation, resolvedParam);
        }

        if (resolvedParam.type === InjectableType.DYNAMIC) {
            return this.resolveDynamicChild(invocation, resolvedParam);
        }

        return this.resolveChildByName(invocation, resolvedParam);

    }

    private resolveChildProps<P>(invocation: DiInvocation<P>): InvocationResult<any> {
        if (invocation.properties == null
        ) {
            throw Error(`can't resolve properties for $props - There are no properties passed to the beanRuntime`);
        }

        return {
            result: invocation.properties,
            pendingDependencies: {}
        };
    }

    private resolveChildByType<P>(invocation: DiInvocation<P>, childParamMetadata: DiParamMetadata): InvocationResult<any> {
        return this.resolve(
            this.diInvocationFactory.childrenOf(
                invocation,
                <IVarArgConstructor<any>>childParamMetadata.payload,
                childParamMetadata.propsProvider
            )
        );
    }

    private resolveDynamicChild<P>(invocation: DiInvocation<P>, resolvedParam: DiParamMetadata): InvocationResult<any> {
        return this.resolveChildByType(
            invocation,
            {
                payload: (<IProducer<IVarArgConstructor<any>>>resolvedParam.payload)(),
                type: InjectableType.TYPE,
                propsProvider: resolvedParam.propsProvider,
                name: resolvedParam.name
            }
        );
    }


    private resolveChildByName<P>(invocation: DiInvocation<P>, resolvedParam: DiParamMetadata): InvocationResult<any> {
        let nameToResolve: string = <string>resolvedParam.payload;
        if (invocation.transitiveBeans == null || invocation.transitiveBeans[nameToResolve] == null) {
            throw Error(`can't resolve param '${nameToResolve}' - There are no transitive beans passed into the runtime`);
        }

        return {
            result: invocation.transitiveBeans[nameToResolve],
            pendingDependencies: {}
        };
    }
}
