import {AsynAction} from "./asynAction";

export interface MonitorActions {
    tick(toMonitor: AsynAction<any>): void;
    unTick(toMonitor: AsynAction<any>, cancelled: boolean): void;
}
