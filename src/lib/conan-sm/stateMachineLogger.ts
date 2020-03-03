import {Strings} from "../conan-utils/strings";
import {StateMachineStatus} from "./stateMachine";

export enum EventType {
    PROXY = 'PROXY',
    REQUEST = 'REQUEST',
    REACTION = 'REACTION',
    ADD_LISTENER = '+LISTENER',
    ADD_INTERCEPTOR = '+INTERCEPT',
    SHUTDOWN = 'SHUTDOWN',
    FORK = 'FORK',
    FORK_STOP = 'FORK_STOP',
    STAGE = 'STAGE',
    ACTION = 'ACTION',
    INIT = 'INIT'
}

export const eventTypesToLog: EventType[] = [
    EventType.INIT,
    EventType.STAGE,
    EventType.FORK_STOP,
    EventType.ADD_INTERCEPTOR,
    EventType.ADD_LISTENER,
    // EventType.PROXY,
    // EventType.REQUEST,
    EventType.REACTION,
    EventType.FORK,
    EventType.ACTION,
    EventType.SHUTDOWN
];

export const detailLinesToLog: string[] = [
    // 'init listeners',
    'listeners',
    // 'system listeners',
    'stages',
    // 'system stages '
];

export const actionsToIgnore: string[] = [
    'doStart'
];

export const stagesToIgnore: string[] = [
    'init', 'stop', 'start'
];

export const stagesToMute: string[]=[
    'init', '-'
];

export class StateMachineLogger {
    static log(smName: string, status: StateMachineStatus, stageName: string, actionName: string, eventType: EventType, transactionId: string, details?: string, additionalLines?: [string, string][]): void {
        if (eventTypesToLog.indexOf(eventType) < 0) return;
        if (stagesToMute.indexOf(stageName) > -1) return;
        if (eventType === EventType.STAGE && stagesToIgnore.indexOf(stageName) > -1) return;
        if ((eventType === EventType.ACTION || eventType === EventType.REACTION) && actionsToIgnore.indexOf(actionName) > -1) return;

        let transactionSplit: string [] = transactionId.split('/');
        let transactionRoot: string = '/' + transactionSplit [0] + transactionSplit [1];
        let transactionRemainder: string = transactionSplit.length < 3 ? '/' : transactionId.substring(transactionRoot.length, transactionId.length);

        if (additionalLines){
            console.log('--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------')
        }

        console.log(
            Strings.padEnd(`${smName}`, 30),
            Strings.padEnd(status, 15),
            Strings.padEnd(transactionRoot, 15),
            Strings.padEnd(`${stageName}`, 25),
            Strings.padEnd(`${actionName}`, 25),
            Strings.padEnd(`${eventType}`, 14),
            Strings.padEnd(transactionRemainder, 90),
            details
        );

        if (!additionalLines) return;

        additionalLines.forEach(it => {
            if (it[1] == null || it[1] === '{}' || it[1] == '') return;
            let detailLineName = it[0];
            if (detailLinesToLog.indexOf(detailLineName) > -1) {
                console.log("=>", Strings.padEnd(detailLineName, 18), it [1]);
            }
        });
        console.log('--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------')
    }
}
