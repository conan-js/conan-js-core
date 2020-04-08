import { TransactionTree } from "../../conan-tx/transactionTree";
import { StateMachineCoreRead } from "../core/stateMachineCoreReader";
import { StateMachineType } from "../stateMachine";
export declare enum EventType {
    SLEEP = "SLEEP",
    FORK_JOIN = "FORK_JOIN",
    PROXY = "PROXY",
    REQUEST = "REQUEST",
    REACTION = "REACTION",
    DELETE_LISTENER = "-LISTENER",
    ADD_LISTENER = "+LISTENER",
    ADD_INTERCEPTOR = "+INTERCEPT",
    SHUTDOWN = "SHUTDOWN",
    FORCE_RUN = "FORCE_RUN",
    FORK = "FORK",
    FORK_STOP = "FORK_STOP",
    TR_CHAIN = "TR_CHAIN",
    STAGE = "STAGE",
    TR_OPEN = "TR_OPEN",
    TR_CLOSE = "TR_CLOSE",
    ACTION = "ACTION",
    INIT = "INIT"
}
export declare const configToLog: {
    USER: EventType[];
    FLOW: EventType[];
    FLOW_FORK: any[];
    USER_FORK: any[];
};
export declare const eventTypesToLog: EventType[];
export declare const typesOfSmMessagesToLog: StateMachineType[];
export declare const detailLinesToLog: string[];
export declare const actionsToIgnore: string[];
export declare const stagesToIgnore: string[];
export declare const stagesToMute: string[];
export declare const redundantTransactionParts: string[];
export declare class StateMachineLoggerHelper {
    static log(type: StateMachineType, smName: string, status: string, stageName: string, actionName: string, eventType: EventType, transactionId: string, details?: string, additionalLines?: [string, any][]): void;
}
export interface StateMachineLogger {
    log(eventType: EventType, details?: string, additionalLines?: [string, any][]): void;
}
export declare let Logger$: (type: StateMachineType, name: string, stateMachineCore: StateMachineCoreRead<any>, transactionTree: TransactionTree) => StateMachineLogger;
