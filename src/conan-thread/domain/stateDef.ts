import {Reducers, ReducersFn} from "./reducers";
import {AsapLike} from "../../conan-utils/asap";
import {ActionsFn} from "./threadActions";
import {IBiConsumer, IPartial} from "../..";
import {FlowRuntimeEvent} from "../../conan-flow/domain/flowRuntimeEvents";
import {LoggingOptions} from "../../conan-flow/logic/flowLogger";

export interface StateDef<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = void> {
    name: string,
    initialData?: AsapLike<DATA>,
    reducers?: ReducersFn<DATA, REDUCERS>,
    actions?: ActionsFn<DATA, REDUCERS, IPartial<ACTIONS>>,
    autoBind?: any,
    pipelineListener?: IBiConsumer<FlowRuntimeEvent, LoggingOptions>;
    cancelAutoStart?: boolean;
}
