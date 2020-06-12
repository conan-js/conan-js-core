import {Reducers, ReducersFn} from "../../conan-thread/domain/reducers";
import {AsapLike} from "../../conan-utils/asap";
import {ActionsFn} from "../../conan-thread/domain/threadActions";

export interface MonitorDef<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = void> {
    name: string,
    initialData?: AsapLike<DATA>,
    reducers?: ReducersFn<DATA, REDUCERS>,
    actions?: ActionsFn<DATA, REDUCERS, ACTIONS>,
    autoBind?: any,
}
