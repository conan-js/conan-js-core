import {Strings} from "../../conan-utils/strings";
import {TransactionTree} from "../../conan-tx/transactionTree";
import {StateMachineCoreRead} from "../core/stateMachineCoreReader";
import {StateMachineType} from "../stateMachine";


export enum EventType {
    SLEEP='SLEEP',
    FORK_JOIN = "FORK_JOIN",
    PROXY = 'PROXY',
    REQUEST = 'REQUEST',
    REACTION = 'REACTION',
    DELETE_LISTENER = "-LISTENER",
    ADD_LISTENER = '+LISTENER',
    ADD_INTERCEPTOR = '+INTERCEPT',
    SHUTDOWN = 'SHUTDOWN',
    FORCE_RUN = 'FORCE_RUN',
    FORK = 'FORK',
    FORK_STOP = 'FORK_STOP',
    TR_CHAIN = 'TR_CHAIN',
    STAGE = 'STAGE',
    TR_OPEN = 'TR_OPEN',
    TR_CLOSE = 'TR_CLOSE',
    ACTION = 'ACTION',
    INIT = 'INIT'
}

export const configToLog = {
    [StateMachineType.USER]: [
        EventType.INIT,
        EventType.STAGE,
        EventType.ACTION,
        EventType.FORK,
        EventType.FORK_JOIN,
        EventType.FORK_STOP,
        EventType.SLEEP
    ],
    [StateMachineType.FLOW]: [
        EventType.ACTION,
    ],
    [StateMachineType.FLOW_FORK]: [
        // EventType.ACTION,
        // EventType.STAGE,
    ],
    [StateMachineType.USER_FORK]: [
        // EventType.STAGE,
        EventType.ACTION
    ],

};

export const eventTypesToLog: EventType[] = [

];

export const typesOfSmMessagesToLog: StateMachineType[] = [
    StateMachineType.USER,
    // StateMachineType.FLOW,
    // StateMachineType.FORK
];

export const detailLinesToLog: string[] = [
    'init listeners',
    'listeners',
    // 'system listeners',
    'stages',
    // 'system stages ',
    'current state',
    'payload'
];

export const actionsToIgnore: string[] = [
    // 'doStart'
];

export const stagesToIgnore: string[] = [
    'init', 'running'//, 'start'
];

export const stagesToMute: string[]=[
    // 'init', '-'
];

export const redundantTransactionParts: string [] = [
    // '::init',
    // '=>doStart',
    // '::start'
];

export class StateMachineLoggerHelper {
    static log(type: StateMachineType, smName: string, status: string, stageName: string, actionName: string, eventType: EventType, transactionId: string, details?: string, additionalLines?: [string, any][]): void {
        // if (type && typesOfSmMessagesToLog.indexOf(type) < 0) return;
        // if (eventTypesToLog.indexOf(eventType) < 0) return;

        if (configToLog[type].indexOf(eventType) < 0) return;

        // if (stagesToMute.indexOf(stageName) > -1) return;
        // if (eventType === EventType.STAGE && stagesToIgnore.indexOf(stageName) > -1) return;
        // if ((eventType === EventType.ACTION || eventType === EventType.REACTION) && actionsToIgnore.indexOf(actionName) > -1) return;

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

        if (additionalLines && (eventType === EventType.INIT || eventType === EventType.SHUTDOWN)){
            console.log('----------------------------------------------------------------------------------------------------------------------------------------------------')
        }

        console.log(
            Strings.padEnd(`${smName}`, 30),
            Strings.padEnd(`${eventType}`, 14),
            Strings.padEnd(details, 50),
            Strings.padEnd(`${stageName}`, 25),
            Strings.padEnd(`${actionName}`, 25),
            // Strings.padEnd(status, 15),
            // Strings.padEnd(transactionRoot, 28),
            // transactionRemainder,
        );

        if (!additionalLines) return;

        additionalLines.forEach(it => {
            let value = it[1];
            if (value == null || value === '{}' || value == '') {
                value = '';
            }
            let detailLineName = it[0];
            let isMilestone = detailLineName.indexOf('::') === 0 || detailLineName.indexOf('=>') === 0;
            if (isMilestone || detailLinesToLog.indexOf(detailLineName) > -1) {
                if (isMilestone) {
                    console.log(
                        Strings.padEnd('', 5),
                        detailLineName,
                    );
                    if (value !== '' && value != null){
                        console.log(
                            Strings.padEnd('', 5),
                            value,
                        );
                    }
                    console.log('----------------------------------------------------------------------------------------------------------------------------------------------------')
                } else {
                    console.log(Strings.padEnd(detailLineName, 30), value);
                }
            }
        });
        if (additionalLines && (eventType === EventType.INIT || eventType === EventType.SHUTDOWN)) {
            console.log('----------------------------------------------------------------------------------------------------------------------------------------------------')
        }
    }
}


export interface StateMachineLogger {
    log (eventType: EventType, details?: string, additionalLines?: [string, any][]): void;
}

export let Logger$ = (type: StateMachineType, name: string, stateMachineCore: StateMachineCoreRead<any>, transactionTree : TransactionTree): StateMachineLogger=>({
    log: (eventType: EventType, details?: string, additionalLines?: [string, string][]): void => {
        StateMachineLoggerHelper.log(
            type,
            name,
            undefined,
            stateMachineCore.getCurrentStateName(),
            stateMachineCore.getCurrentTransitionName(),
            eventType,
            transactionTree ? transactionTree.getCurrentTransactionId(): '-',
            details,
            additionalLines
        )
    }
});
