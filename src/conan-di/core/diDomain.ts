import {DiMetadata} from './annotations/diAnnotationsDomain';
import {IFunctionVarArg, IKeyValuePairs, IVarArgConstructor} from "../../conan-utils/typesHelper";

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

export type Injectable<T> = (IVarArgConstructor<T> | IFunctionVarArg<T> | T)

export type DiContextDef<T> = {
    [P in keyof T]: Injectable<T[P]>;
};

export interface Runtime {
    invoke<T>(
        from: IVarArgConstructor<T>,
        transitiveBeans: IKeyValuePairs<any>,
        context: IKeyValuePairs<Injectable<any>>
    ): T;

    invokeWithProps<T, P>(
        from: IVarArgConstructor<T>,
        props: P,
        transitiveBeans: IKeyValuePairs<any>,
        context: IKeyValuePairs<Injectable<any>>
    ): T;
}
