import {AsynAction} from "./asynAction";

export enum MonitorStatus {
    IDLE = 'IDLE',
    ASYNC_START = "ASYNC_START",
    ASYNC_FULFILLED = "ASYNC_FULFILLED",
    ASYNC_CANCELLED = "ASYNC_CANCELLED",
}

export interface MonitorInfo {
    inProgressActions?: AsynAction<any>[],
    currentAction?: AsynAction<any>,
    status?: MonitorStatus,
}
