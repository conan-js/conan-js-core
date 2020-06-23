import {Reducers, ReducersFn} from "./reducers";
import {AsapLike} from "../../conan-utils/asap";
import {ActionsFn} from "./threadActions";
import {IConsumer, IPartial} from "../..";
import {FlowEvent, FlowEventNature} from "../../conan-flow/domain/flowRuntimeEvents";
import {UserReactionsDef} from "../../conan-flow/def/reactionDef";

export interface StateDef<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = void> {
    name: string,
    initialData?: AsapLike<DATA>,
    reducers?: ReducersFn<DATA, REDUCERS>,
    actions?: ActionsFn<DATA, REDUCERS, IPartial<ACTIONS>>,
    autoBind?: any,
    pipelineListener?: IConsumer<FlowEvent>;
    cancelAutoStart?: boolean;
    reactions?: UserReactionsDef<{ nextData: DATA }, 'nextData', { nextData: ACTIONS & REDUCERS }>;
    nature?: FlowEventNature;
}
