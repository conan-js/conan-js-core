import {DiMetadata, DiParamMetadata, InjectableType} from './annotations/diAnnotationsDomain';
import {DiRuntime} from './diRuntime';
import {DiInvocation, Injectable, InvocationResult} from './diDomain';
import {DiInvocationFactory} from './diInvocationBuilder';
import {KeyValueCache} from "../../conan-utils/keyValueCache";
import {IBiFunction, IKeyValuePairs, IProducer, IVarArgConstructor} from "../../conan-utils/typesHelper";

export class DiInvocationResolver {
    constructor(
        private readonly diInvocationFactory: DiInvocationFactory,
        private readonly diCache: KeyValueCache,
        private readonly diEnricher: IBiFunction<DiMetadata, any, any> | null
    ) {}

    resolve<T, P>(
        invocation: DiInvocation<P>,
        context: IKeyValuePairs<Injectable<any>>,
        diRuntime: DiRuntime
    ): InvocationResult<T> {
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
                freshInvocationResult = this.doCreate<T, P>(invocation, context, diRuntime);
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

    private doCreate<T, P>(invocation: DiInvocation<P>, context: IKeyValuePairs<Injectable<any>>, diRuntime: DiRuntime): InvocationResult<T> {
        const useConstructorOrFn = (invocation: DiInvocation<P>, params: any): any =>{
            let constructor = <any>invocation.diMetadata.constructor;
            if (!!constructor.prototype && !!constructor.prototype.constructor.name) {
                return params ? new constructor (...params): new constructor()
            } else {
                return params ? constructor (...params): constructor();
            }
        }
        if (invocation.diMetadata.argumentNames.length === 0) {
            let result = useConstructorOrFn(invocation, undefined);
            return {
                result: result,
                pendingDependencies: {}
            };
        }

        let childrenInvocationResults: InvocationResult<any>[] = this.invokeChildren(invocation, context, diRuntime);
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
            result: useConstructorOrFn(invocation, params),
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


    private invokeChildren<P>(invocation: DiInvocation<P>, context: IKeyValuePairs<Injectable<any>>, diRuntime: DiRuntime): InvocationResult<any> [] {
        let
            params: InvocationResult<any>[] = [];

        invocation
            .diMetadata
            .argumentNames
            .forEach(argumentName => {
                    let resolvedParam = this.resolveParamDef<P>(invocation, argumentName);
                    params.push(
                        this.invokeChild(invocation, resolvedParam, context, diRuntime)
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

    private invokeChild<P>(invocation: DiInvocation<P>, resolvedParam: DiParamMetadata, context: IKeyValuePairs<Injectable<any>>, diRuntime: DiRuntime): InvocationResult<any> {
        if (resolvedParam.name === DiRuntime.PROPS_PROPERTY_NAME) {
            return this.resolveChildProps(invocation);
        }

        if (resolvedParam.type === InjectableType.TYPE) {
            return this.resolveChildByType(invocation, resolvedParam, context, diRuntime);
        }

        if (resolvedParam.type === InjectableType.DYNAMIC) {
            return this.resolveDynamicChild(invocation, resolvedParam, context, diRuntime);
        }

        return this.resolveChildByName(invocation, resolvedParam, context, diRuntime);

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

    private resolveChildByType<P>(invocation: DiInvocation<P>, childParamMetadata: DiParamMetadata, context: IKeyValuePairs<Injectable<any>>, diRuntime: DiRuntime): InvocationResult<any> {
        return this.resolve(
            this.diInvocationFactory.childrenOf(
                invocation,
                <IVarArgConstructor<any>>childParamMetadata.payload,
                childParamMetadata.propsProvider,
            ),
            context,
            diRuntime
        );
    }

    private resolveDynamicChild<P>(invocation: DiInvocation<P>, resolvedParam: DiParamMetadata, context: IKeyValuePairs<Injectable<any>>, diRuntime: DiRuntime): InvocationResult<any> {
        return this.resolveChildByType(
            invocation,
            {
                payload: (<IProducer<IVarArgConstructor<any>>>resolvedParam.payload)(),
                type: InjectableType.TYPE,
                propsProvider: resolvedParam.propsProvider,
                name: resolvedParam.name
            },
            context,
            diRuntime
        );
    }


    private resolveChildByName<P>(invocation: DiInvocation<P>, resolvedParam: DiParamMetadata, context: IKeyValuePairs<Injectable<any>>, diRuntime: DiRuntime): InvocationResult<any> {
        let nameToResolve: string = <string>resolvedParam.payload;
        if (invocation.transitiveBeans == null || invocation.transitiveBeans[nameToResolve] == null) {
            if (context[nameToResolve] != null){
                let byName = diRuntime.invoke(context[nameToResolve], invocation.transitiveBeans, context);
                return {
                    result: byName,
                    pendingDependencies: {}
                };
            }else {
                throw Error(`can't resolve param '${nameToResolve}' - There are no transitive beans passed into the runtime`);
            }
        }

        return {
            result: invocation.transitiveBeans[nameToResolve],
            pendingDependencies: {}
        };
    }
}
