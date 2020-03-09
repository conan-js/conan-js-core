import {Transaction, TransactionRequest} from "../conan-tx/transaction";
import {Stage, StageDef} from "./stage";
import {StageToProcess, StateMachine, ToProcessType} from "./stateMachine";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {ICallback, WithMetadataArray} from "../conan-utils/typesHelper";
import {OnEventCallback} from "./stateMachineListeners";
import {SmTransition} from "./stateMachineEvents";
import {Strings} from "../conan-utils/strings";
import {TransactionRequests} from "../conan-tx/transactionRequests";

export class SmTransactionsRequests {
    createStageTransactionRequest(stateMachine: StateMachine<any, any, any>, stageToProcess: StageToProcess): TransactionRequest {
        let intoStageName = stageToProcess.stage.stage;
        let stageDef = stateMachine.data.stageDefsByKey [intoStageName];
        let isDeferredStage: boolean = !!(stageDef && stageDef.deferredInfo);
        let eventName = Strings.camelCaseWithPrefix('on', stageToProcess.stage.stage);

        let isOnForkJoiningBack = stateMachine.data.parent && stateMachine.data.parent.joinsInto.indexOf(stageToProcess.stage.stage) !== -1;
        let actions = stateMachine.createActions(stateMachine, stateMachine.data.stageDefsByKey, stageToProcess.stage.stage, stageToProcess.stage.state);

        if (isDeferredStage) {
            return this.createForkTransactionRequest(stateMachine, stageToProcess.stage, stageDef);
        }

        if (isOnForkJoiningBack) {
            return this.createJoinTransactionRequest(stateMachine, stageToProcess.stage, stateMachine.data.parent.stateMachine);
        }

        return this.createNormalStageTransactionRequest(stateMachine, stageToProcess.stage, actions, stateMachine.createReactions(eventName, stateMachine.data.listeners), () => {
            stateMachine.eventThread.addStageEvent(stageToProcess.stage, eventName, stageToProcess.stage.state);
            StateMachineLogger.log(stateMachine.data.name, stateMachine._status, stateMachine.eventThread.getCurrentStageName(), stateMachine.eventThread.getCurrentActionName(), EventType.STAGE, stateMachine.transactionTree.getCurrentTransactionId(), `::${stageToProcess.stage.stage}`);
        });
    }

    createActionTransactionRequest(stateMachine: StateMachine<any, any, any>, transition: SmTransition, actions: any, reactions: WithMetadataArray<OnEventCallback<any>, string>, onStart: ICallback): TransactionRequest {
        return this.doEnrich(stateMachine, {
            name: `=>${transition.path}`,
            onStart: {
                metadata: `[start-action]>${transition.path}`,
                value: onStart,
            },
            reactionsProducer: () => this.reactionsAsCallbacks(stateMachine, reactions, actions),
            doChain: {
                metadata: `[request-stage]::${transition.into.stage}`,
                value: () => {
                    StateMachineLogger.log(stateMachine.data.name, stateMachine._status, stateMachine.eventThread.getCurrentStageName(), stateMachine.eventThread.getCurrentActionName(), EventType.TR_CHAIN, stateMachine.transactionTree.getCurrentTransactionId(), `//::${transition.into.stage}`);
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

    createNormalStageTransactionRequest(stateMachine: StateMachine<any, any, any>, stage: Stage, actions: any, reactions: WithMetadataArray<OnEventCallback<any>, string>, onStart: ICallback): TransactionRequest {
        return this.doEnrich(stateMachine, {
            name: `::${stage.stage}`,
            onStart: {
                metadata: `[start-stage]>`,
                value: onStart
            },
            reactionsProducer: () => this.reactionsAsCallbacks(stateMachine, reactions, actions)
        });
    }


    createForkTransactionRequest(stateMachine: StateMachine<any, any, any>, stage: Stage, stageDef: StageDef<any, any, any>): TransactionRequest {
        return this.doEnrich(stateMachine, {
            name: `->::${stage.stage}`,
            reactionsProducer: () => [{
                metadata: `([fork]::${stage.stage})`,
                value: () => stateMachine.fork(
                    stage,
                    (actions) => stageDef.deferredInfo.deferrer(actions, stage.state),
                    stageDef.deferredInfo.joinsInto
                )
            }]
        })
    }

    createJoinTransactionRequest(stateMachine: StateMachine<any, any, any>, stage: Stage, parentSm: StateMachine<any, any, any>): TransactionRequest {
        return this.doEnrich(stateMachine, {
            name: `<-::${stage.stage}`,
            reactionsProducer: () => [{
                metadata: `[stop-child-fork]`,
                value: () => {
                    StateMachineLogger.log(stateMachine.data.name, stateMachine._status, stateMachine.eventThread.getCurrentStageName(), stateMachine.eventThread.getCurrentActionName(), EventType.FORK_STOP, stateMachine.transactionTree.getCurrentTransactionId(), `!::${stage.stage}`);
                    stateMachine.requestStage({
                        stage: {stage: 'stop'},
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
                        description: `<=${stage.stage}`,
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

    private reactionsAsCallbacks(stateMachine: StateMachine<any, any, any>, reactions: WithMetadataArray<OnEventCallback<any>, string>, actions: any) {
        return reactions.map(it => ({
            metadata: it.metadata,
            value: () => it.value(actions, {sm: stateMachine})
        }));
    }
}
