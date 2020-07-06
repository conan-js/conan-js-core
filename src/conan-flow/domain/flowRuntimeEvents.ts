import {FlowImpl} from "../logic/flowImpl";

export enum FlowEventNature {
    MAIN = "MAIN",
    META = "META",
    HELPER = "HELPER",
    ASYNC = "ASYNC",
    AUX = "AUX",
    ASAP = "ASAP",
}

export enum FlowEventSource {
    FLOW_CONTROLLER = "FLOW_CONTROLLER",
    FLOW_THREAD = "FLOW_THREAD",
    CONTEXT = "CONTEXT",
    USER_MSG = "USER_MSG",
    FLOW_FACTORY = "FLOW_FACTORY"
}

export enum FlowEventLevel {
    DEBUG = "DEBUG",
    TRACE = "TRACE",
    INFO = "INFO",
    MILESTONE = "MILESTONE",
    WARN = "WARN",
    ERROR = "ERROR",
}

export enum FlowEventTiming {
    CONTINUE = "CONTINUE",
    START = "START",
    END = "END",
    CANCEL = "CANCEL",
    IN_PROCESS = "IN_PROCESS",
}

export enum FlowEventType {
    MONITORING = "MONITORING",
    PROCESSING_REACTIONS = "PROCESSING_REACTIONS",
    STARTING = "STARTING",
    ONCE_ON = "ONCE_ON",
    RUN_IF = "RUN_IF",
    RUN = "RUN",
    ADDING_REACTION = "ADDING_REACTION",
    ERROR_USER_CODE = "ERROR_USER_CODE",
    MONITOR_TRANSACTION = "MONITOR_TRANSACTION",
    REQUESTING_STATUS = "REQUESTING_STATUS",
    SETTLING_STATUS = "SETTLING_STATUS",
    PROCESSING_STATUS = "PROCESSING_STATUS",
    STATUS_REQUEST_COMPLETED = "STATUS_REQUEST_COMPLETED",
    REQUESTING_TRANSITION = "REQUESTING_TRANSITION",
    ROOT_REQUEST = "ROOT_REQUEST",
    CREATING = "CREATING",
    USER_REACTIONS = "USER_REACTIONS",
    USER_CODE = "USER_CODE",
}

export interface FlowEvent {
    nature: FlowEventNature,
    flowController: FlowImpl<any, any>,
    source: FlowEventNature,
    type: FlowEventType,
    timing: FlowEventTiming,
    level: FlowEventLevel,
    payload?: any,
    shortDesc?: any,
}
