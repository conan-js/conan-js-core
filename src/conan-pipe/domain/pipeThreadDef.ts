import {ActionsFn} from "../../conan-thread/domain/threadActions";
import {AsapLike, IConsumer, IPartial, Reducers} from "../..";
import {FlowEvent, FlowEventNature} from "../../conan-flow/domain/flowRuntimeEvents";
import {UserReactionsDef} from "../../conan-flow/def/reactionDef";

export interface PipeThreadDef<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = void> {
    nature?: FlowEventNature,
    actions?: ActionsFn<DATA, { }, IPartial<ACTIONS>>,
    pipelineListener?: IConsumer<FlowEvent>;
    reactions?: UserReactionsDef<{ nextData: DATA }, 'nextData', { nextData: ACTIONS & REDUCERS }>,
    initialData?: AsapLike<DATA>,
}
