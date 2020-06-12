import {MonitorInfo, MonitorStatus} from "../../../src/core/conan-monitor/domain/monitorInfo";

export interface MonitorInfoOnlyNames {
    inProgressActions?: string[],
    currentAction?: string,
    status?: MonitorStatus
}

export function extractNamesFromMonitorInfos(monitorInfos: MonitorInfo[]): MonitorInfoOnlyNames[] {
    return monitorInfos.map(it=>({
        status: it.status,
        ... (it.currentAction? {currentAction: it.currentAction.name}: undefined),
        inProgressActions: it.inProgressActions.map(tick=>tick.name)
    }))
}
