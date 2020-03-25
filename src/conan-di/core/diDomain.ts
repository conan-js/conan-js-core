import {DiMetadata} from './annotations/diAnnotationsDomain';
import {IKeyValuePairs, IVarArgConstructor} from "../../conan-utils/typesHelper";

export interface InvocationResult<T> {
    circularDependencyEndOf?: string;
    result: T | null;
    pendingDependencies: IKeyValuePairs<string[]>;
}

export interface DiInvocation<P> {
    diMetadata: DiMetadata;
    inProcessDiInvocations: string[];
    transitiveBeans?: IKeyValuePairs<any>;
    properties?: P | null;
}

export type DiContextDef<T> = {
    [P in keyof T]: IVarArgConstructor<T[P]>;
};

export interface Runtime {
    invoke<T>(
        from: IVarArgConstructor<T>,
        transitiveBeans?: IKeyValuePairs<any>,
    ): T;

    invokeWithProps<T, P>(
        from: IVarArgConstructor<T>,
        props: P,
        transitiveBeans?: IKeyValuePairs<any>,
    ): T;
}
