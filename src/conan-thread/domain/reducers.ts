import {IFunction, IFunctionVarArg, IKeyValuePairs} from "../..";
import {StateDataProducer} from "../../conan-flow/domain/flowEvents";
import {ThreadFlow} from "../factories/threads";

export type Reducers<DATA> =IKeyValuePairs<IFunctionVarArg<DATA>>;

export type ReducersFn<DATA, REDUCERS extends Reducers<DATA>> = IFunction<StateDataProducer<ThreadFlow<DATA>, "nextData">, REDUCERS>
