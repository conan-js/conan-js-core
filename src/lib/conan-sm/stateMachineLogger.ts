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
    static log(smName: string, stageName: string, actionName: string, eventType: EventType, transactionId: string, details?: string, additionalLines?: [string, string][]): void {
        if (toLog.indexOf(eventType) < 0) return;

        let transactionSplit: string [] = transactionId.split('/');
        let transactionRoot: string = '/' + transactionSplit [0] + transactionSplit [1];
        let transactionRemainder: string = transactionSplit.length < 3 ? '/' : transactionId.substring(transactionRoot.length, transactionId.length);

        if (additionalLines){
            console.log('--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------')
        }

        console.log(
            Strings.padEnd(`${smName}`, 30),
            Strings.padEnd(transactionRoot, 15),
            Strings.padEnd(`${stageName}`, 25),
            Strings.padEnd(`${actionName}`, 25),
            Strings.padEnd(`${eventType}`, 14),
            Strings.padEnd(transactionRemainder, 90),
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
