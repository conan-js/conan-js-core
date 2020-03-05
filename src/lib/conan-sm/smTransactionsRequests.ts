import {Transaction, TransactionRequest} from "../conan-tx/transaction";
import {Stage, StageDef} from "./stage";
import {StageToProcess, StateMachine, ToProcessType} from "./stateMachine";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {ICallback, WithMetadataArray} from "../conan-utils/typesHelper";
import {SmEventCallback} from "./stateMachineListeners";
import {SmTransition} from "./stateMachineEvents";
import {Strings} from "../conan-utils/strings";
import {TransactionRequests} from "../conan-tx/transactionRequests";

export class SmTransactionsRequests {
    createStageTransactionRequest(stateMachine: StateMachine<any, any, any>, stageToProcess: StageToProcess): TransactionRequest {
        let intoStageName = stageToProcess.stage.name;
        let stageDef = stateMachine.data.stageDefsByKey [intoStageName];
        let isDeferredStage: boolean = !!(stageDef && stageDef.deferredInfo);
        let eventName = Strings.camelCaseWithPrefix('on', stageToProcess.stage.name);

        let isOnForkJoiningBack = stateMachine.data.parent && stateMachine.data.parent.joinsInto.indexOf(stageToProcess.stage.name) !== -1;
        let actions = stateMachine.createActions(stateMachine, stateMachine.data.stageDefsByKey, stageToProcess.stage.name, stageToProcess.stage.requirements);

        if (isDeferredStage) {
            return this.createForkTransactionRequest(stateMachine, stageToProcess.stage, stageDef);
        }

        if (isOnForkJoiningBack) {
            return this.createJoinTransactionRequest(stateMachine, stageToProcess.stage, stateMachine.data.parent.stateMachine);
        }

        return this.createNormalStageTransactionRequest(stateMachine, stageToProcess.stage, actions, stateMachine.createReactions(eventName, stateMachine.data.listeners), () => {
            stateMachine.eventThread.addStageEvent(stageToProcess.stage, eventName, stageToProcess.stage.requirements);
            StateMachineLogger.log(stateMachine.data.name, stateMachine._status, stateMachine.eventThread.getCurrentStageName(), stateMachine.eventThread.getCurrentActionName(), EventType.STAGE, stateMachine.transactionTree.getCurrentTransactionId(), `::${stageToProcess.stage.name}`);
        });
    }

    createActionTransactionRequest(stateMachine: StateMachine<any, any, any>, transition: SmTransition, actions: any, reactions: WithMetadataArray<SmEventCallback<any>, string>, onStart: ICallback): TransactionRequest {
        return this.doEnrich(stateMachine, {
            name: `=>${transition.path}`,
            onStart: {
                metadata: `[start-action]>${transition.path}`,
                value: onStart,
            },
            reactionsProducer: () => this.reactionsAsCallbacks(stateMachine, reactions, actions),
            doChain: {
                metadata: `[request-stage]::${transition.into.name}`,
                value: () => {
                    StateMachineLogger.log(stateMachine.data.name, stateMachine._status, stateMachine.eventThread.getCurrentStageName(), stateMachine.eventThread.getCurrentActionName(), EventType.TR_CHAIN, stateMachine.transactionTree.getCurrentTransactionId(), `//::${transition.into.name}`);
                    return this.createStageTransactionRequest(stateMachine, {
                        description: `=>${transition.path}`,
                        eventType: EventType.STAGE,
                        stage: transition.into,
                        type: ToProcessType.STAGE
                    });
                }
            }
        })
    }

    createNormalStageTransactionRequest(stateMachine: StateMachine<any, any, any>, stage: Stage, actions: any, reactions: WithMetadataArray<SmEventCallback<any>, string>, onStart: ICallback): TransactionRequest {
        return this.doEnrich(stateMachine, {
            name: `::${stage.name}`,
            onStart: {
                metadata: `[start-stage]>`,
                value: onStart
            },
            reactionsProducer: () => this.reactionsAsCallbacks(stateMachine, reactions, actions)
        });
    }


    createForkTransactionRequest(stateMachine: StateMachine<any, any, any>, stage: Stage, stageDef: StageDef<any, any, any>): TransactionRequest {
        return this.doEnrich(stateMachine, {
            name: `->::${stage.name}`,
            reactionsProducer: () => [{
                metadata: `([fork]::${stage.name})`,
                value: () => stateMachine.fork(
                    stage,
                    (actions) => stageDef.deferredInfo.deferrer(actions, stage.requirements),
                    stageDef.deferredInfo.joinsInto
                )
            }]
        })
    }

    createJoinTransactionRequest(stateMachine: StateMachine<any, any, any>, stage: Stage, parentSm: StateMachine<any, any, any>): TransactionRequest {
        return this.doEnrich(stateMachine, {
            name: `<-::${stage.name}`,
            reactionsProducer: () => [{
                metadata: `[stop-child-fork]`,
                value: () => {
                    StateMachineLogger.log(stateMachine.data.name, stateMachine._status, stateMachine.eventThread.getCurrentStageName(), stateMachine.eventThread.getCurrentActionName(), EventType.FORK_STOP, stateMachine.transactionTree.getCurrentTransactionId(), `!::${stage.name}`);
                    stateMachine.requestStage({
                        stage: {name: 'stop'},
                        description: '::stop',
                        eventType: EventType.FORK_STOP,
                        type: ToProcessType.STAGE
                    });
                }
            }],
            onDone: ({
                metadata: `[parent-join]`, value: (): void => {
                    parentSm.join({
                        stage: stage,
                        description: `<=${stage.name}`,
                        eventType: EventType.FORK_JOIN,
                        type: ToProcessType.STAGE
                    });
                }
            })
        })
    }

    private doEnrich(stateMachine: StateMachine<any, any, any>, toEnrich: TransactionRequest): TransactionRequest {
        return TransactionRequests.enrich(
            TransactionRequests.enrich(
                toEnrich,
            'onDone', (tx) => this.doLog(stateMachine, tx, EventType.TR_CLOSE)),
            'onStart', (tx) => this.doLog(stateMachine, tx, EventType.TR_OPEN)
        );
    }


    private doLog(stateMachine: StateMachine<any, any, any>, transaction: Transaction, eventType: EventType) {
        StateMachineLogger.log(stateMachine.data.name, stateMachine._status, stateMachine.eventThread.getCurrentStageName(), stateMachine.eventThread.getCurrentActionName(), eventType, transaction.getId(), transaction.getThisName());
    }

    private reactionsAsCallbacks(stateMachine: StateMachine<any, any, any>, reactions: WithMetadataArray<SmEventCallback<any>, string>, actions: any) {
        return reactions.map(it => ({
            metadata: it.metadata,
            value: () => it.value(actions, {sm: stateMachine})
        }));
    }
}