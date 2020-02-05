import {DiInvocationResolver} from './diInvocationResolver';
import {DiInvocationBuilderFactory} from './diInvocationBuilder';
import {DiInvocation, Runtime} from './diDomain';
import {IKeyValuePairs, IVarArgConstructor} from "../../conan-utils/typesHelper";

export class DiRuntime implements Runtime {
    static readonly PROPS_PROPERTY_NAME = '$props';

    constructor(
        private readonly diInvocationResolver: DiInvocationResolver,
        private readonly diInvocationBuilderFactory: DiInvocationBuilderFactory
    ) {
    }

    invoke<T>(
        from: IVarArgConstructor<T>,
        transitiveBeans?: IKeyValuePairs<any>,
    ): T {

        let invocation: DiInvocation<any> = this.diInvocationBuilderFactory.root (from)
            .if(transitiveBeans != null, it => it.withTransitiveBeans(transitiveBeans))
            .build();
        let result: T | null = this.diInvocationResolver.resolve <T, any>(invocation).result;
        if (result == null) throw Error (`Can't invoke`);
        return result;
    }

    invokeWithProps<T, P>(
        from: IVarArgConstructor<T>,
        props: P,
        transitiveBeans?: IKeyValuePairs<any>,
    ): T {
        let invocation: DiInvocation<any> = this.diInvocationBuilderFactory.root (from)
            .withProperties(props)
            .if(transitiveBeans != null, it => it.withTransitiveBeans(transitiveBeans))
            .build();
        let result: T | null = this.diInvocationResolver.resolve <T, any>(invocation).result;
        if (result == null) throw Error (`Can't invoke`);
        return result;
    }

}
