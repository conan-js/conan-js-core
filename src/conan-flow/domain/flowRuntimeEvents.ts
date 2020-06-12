import {FlowImpl} from "../logic/flowImpl";

export enum FlowRuntimeEventSource {
    FLOW_CONTROLLER = "FLOW_CONTROLLER",
    FLOW_THREAD = "FLOW_THREAD",
    CONTEXT = "CONTEXT",
    FLOW_FACTORY = "FLOW_FACTORY"
}

export enum FlowRuntimeEventTiming {
    REQUEST_START = "REQUEST_START",
    REQUEST_END = "REQUEST_END",
    REQUEST_CANCEL = "REQUEST_CANCEL",
    USER_TRACE = "USER_TRACE",
    TRACE = "TRACE",
    INFO = "INFO",
}

export enum FlowRuntimeEventType {
    MONITOR = "MONITOR",
    PROCESS_REACTIONS = "PROCESS_REACTIONS",
    START = "START",
    REQUEST_STATUS = "REQUEST_STATUS",
    FLAG_AS_SETTLED = "FLAG_AS_SETTLED",
    USER_MSG = "USER_MSG",
    REQUEST_TRANSITION = "REQUEST_TRANSITION",
    CREATE_FLOW = "CREATE_FLOW",
}

export interface FlowRuntimeEvent {
    flowController: FlowImpl<any, any>,
    source: FlowRuntimeEventSource,
    runtimeEvent: FlowRuntimeEventType,
    timing: FlowRuntimeEventTiming,
    payload?: any,
    shortDesc?: any,
}
