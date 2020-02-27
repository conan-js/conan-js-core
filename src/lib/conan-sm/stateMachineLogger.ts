import {Strings} from "../conan-utils/strings";

export enum EventType {
    QUEUE = 'QUEUE',
    REACTION = 'REACTION',
    ADD_LISTENER = '+LISTENER',
    ADD_INTERCEPTOR = '+INTERCEPT',
    STOP = 'STOP',
    FORK = 'FORK',
    FORK_STOP = 'FORK_STOP',
    STAGE = 'STAGE',
    REQUEST = 'REQUEST',
    ACTION = 'ACTION',
    INIT = 'INIT'
}

export const toLog: EventType[] = [
    EventType.INIT,
    EventType.STAGE,
    // EventType.QUEUE,
    // EventType.REACTION,
    // EventType.REQUEST,
    EventType.FORK,
    EventType.ACTION,
    EventType.STOP
];

export class StateMachineLogger {
    static log(threadName: string, stageName: string, eventType: EventType, transactionId: string, details?: string, additionalLines?: [string, string][]): void {
        if (toLog.indexOf(eventType) < 0) return;

        let eventTypeCol: string = `${eventType}`;
        let threadNameCol: string = `${threadName}`;
        let stageNameCol: string = `${stageName}`;

        if (additionalLines){
            console.log('--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------')
        }

        console.log(
            Strings.padEnd(threadNameCol, 30),
            Strings.padEnd(stageNameCol, 25),
            Strings.padEnd(eventTypeCol, 14),
            Strings.padEnd(transactionId, 90),
            details
        );

        if (!additionalLines) return;
        if (!additionalLines) return;

        additionalLines.forEach(it => {
            if (it[1] == null || it[1] === '{}' || it[1] == '') return;
            console.log("=>", Strings.padEnd(it [0], 18), it [1]);
        });
        console.log('--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------')
    }
}
