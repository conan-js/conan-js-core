import {ActionsFn} from "../../conan-thread/domain/threadActions";
import {AsapLike, IBiConsumer, IPartial, Reducers} from "../..";
import {FlowRuntimeEvent} from "../../conan-flow/domain/flowRuntimeEvents";
import {LoggingOptions} from "../../conan-flow/logic/flowLogger";
import {UserReactionsDef} from "../../conan-flow/def/reactionDef";

export interface PipeThreadDef<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = void> {
    actions?: ActionsFn<DATA, { }, IPartial<ACTIONS>>,
    pipelineListener?: IBiConsumer<FlowRuntimeEvent, LoggingOptions>;
    reactions?: UserReactionsDef<{ nextData: DATA }, 'nextData', { nextData: ACTIONS & REDUCERS }>,
    initialData?: AsapLike<DATA>,
}
