import {ActionsFn} from "../../conan-thread/domain/threadActions";
import {IBiConsumer, IPartial} from "../..";
import {FlowRuntimeEvent} from "../../conan-flow/domain/flowRuntimeEvents";
import {LoggingOptions} from "../../conan-flow/logic/flowLogger";

export interface PipeThreadDef<DATA, ACTIONS = void> {
    actions?: ActionsFn<DATA, { }, IPartial<ACTIONS>>,
    pipelineListener?: IBiConsumer<FlowRuntimeEvent, LoggingOptions>;
}
