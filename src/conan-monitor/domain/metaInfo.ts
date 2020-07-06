export enum MetaStatus {
    STARTING = 'STARTING',
    INIT = "INIT",
    RUNNING = "RUNNING",
    ERROR = "ERROR",
    IDLE = "IDLE",
    IDLE_ON_TRANSACTION = "IDLE_ON_TRANSACTION",
}

export interface MetaInfo {
    transactionCount: number,
    status?: MetaStatus,
    lastError: any
}
