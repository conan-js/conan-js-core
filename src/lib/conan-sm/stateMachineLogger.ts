import {Strings} from "../conan-utils/strings";
import {StateMachineStatus} from "./stateMachine";

export enum EventType {
    FORK_JOIN = "FORK_JOIN",
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
    EventType.PROXY,
    EventType.REQUEST,
    EventType.REACTION,
    EventType.FORK,
    EventType.FORK_JOIN,
    EventType.ACTION,
    EventType.SHUTDOWN
];

export const detailLinesToLog: string[] = [
    'init listeners',
    'listeners',
    'system listeners',
    'stages',
    'system stages '
];

export const actionsToIgnore: string[] = [
    // 'doStart'
];

export const stagesToIgnore: string[] = [
    // 'init', 'stop', 'start'
];

export const stagesToMute: string[]=[
    // 'init', '-'
];

export const redundantTransactionParts: string [] = [
    // '::init',
    // '=>doStart',
    // '::start'
];

export class StateMachineLogger {
    static log(smName: string, status: StateMachineStatus, stageName: string, actionName: string, eventType: EventType, transactionId: string, details?: string, additionalLines?: [string, string][]): void {
        if (eventTypesToLog.indexOf(eventType) < 0) return;
        if (stagesToMute.indexOf(stageName) > -1) return;
        if (eventType === EventType.STAGE && stagesToIgnore.indexOf(stageName) > -1) return;
        if ((eventType === EventType.ACTION || eventType === EventType.REACTION) && actionsToIgnore.indexOf(actionName) > -1) return;

        let transactionRoot: string = '-';
        let transactionRemainder: string = '';
        if (transactionId != null) {
            let transactionSplit: string [] = transactionId.split('/');
            transactionRoot = '/' + transactionSplit [0] + transactionSplit [1];
            transactionRemainder = transactionId;

            let redundantAccumulated = '';
            redundantTransactionParts.find(part=>{
                let nextRedundantAccumulatedA = redundantAccumulated + '/' + part;
                let nextRedundantAccumulatedB = redundantAccumulated + '//' + part;
                let aIndex = transactionId.indexOf(nextRedundantAccumulatedA);
                let bIndex = transactionId.indexOf(nextRedundantAccumulatedB);
                if (
                    aIndex === -1 &&
                    bIndex === -1
                ) return true;

                redundantAccumulated = aIndex > -1 ? nextRedundantAccumulatedA : nextRedundantAccumulatedB;
                return false;
            });

            if (redundantAccumulated !== '') {
                transactionRemainder = transactionRemainder.substring(redundantAccumulated.length, transactionRemainder.length)
            }
        }

        if (additionalLines){
            console.log('--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------')
        }

        console.log(
            Strings.padEnd(`${smName}`, 30),
            Strings.padEnd(status, 15),
            Strings.padEnd(transactionRoot, 28),
            Strings.padEnd(`${stageName}`, 25),
            Strings.padEnd(`${actionName}`, 25),
            Strings.padEnd(`${eventType}`, 14),
            Strings.padEnd(details, 50),
            transactionRemainder,
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
