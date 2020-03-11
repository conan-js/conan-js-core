import {Transaction, TransactionRequest} from "../conan-tx/transaction";
import {Stage, StageDef} from "./stage";
import {ListenerMetadata, StageToProcess, StateMachineImpl, ToProcessType} from "./stateMachineImpl";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {ICallback, WithMetadataArray} from "../conan-utils/typesHelper";
import {ListenerType, OnEventCallback} from "./stateMachineListeners";
import {SmTransition} from "./stateMachineEvents";
import {Strings} from "../conan-utils/strings";
import {TransactionRequests} from "../conan-tx/transactionRequests";

export class SmTransactionsRequests {
    createStageTransactionRequest(stateMachine: StateMachineImpl<any, any, any>, stageToProcess: StageToProcess): TransactionRequest {
        let intoStageName = stageToProcess.stage.nextState;
        let stageDef = stateMachine.data.stageDefsByKey [intoStageName];
        let isDeferredStage: boolean = !!(stageDef && stageDef.deferredInfo);
        let eventName = Strings.camelCaseWithPrefix('on', stageToProcess.stage.nextState);

        let isOnForkJoiningBack = stateMachine.data.parent && stateMachine.data.parent.joinsInto.indexOf(stageToProcess.stage.nextState) !== -1;
        let actions = stateMachine.createActions(stateMachine, stateMachine.data.stageDefsByKey, stageToProcess.stage.nextState, stageToProcess.stage.data);

        if (isDeferredStage) {
            return this.createForkTransactionRequest(stateMachine, stageToProcess.stage, stageDef);
        }

        if (isOnForkJoiningBack) {
            return this.createJoinTransactionRequest(stateMachine, stageToProcess.stage, stateMachine.data.parent.stateMachine);
        }

        return this.createNormalStageTransactionRequest(stateMachine, stageToProcess.stage, actions, stateMachine.createReactions(eventName, stateMachine.data.listeners), () => {
            stateMachine.eventThread.addStageEvent(stageToProcess.stage, eventName, stageToProcess.stage.data);
            let state = stateMachine.getState();
            StateMachineLogger.log(stateMachine.data.name, stateMachine._status, stateMachine.eventThread.getCurrentStageName(), stateMachine.eventThread.getCurrentActionName(), EventType.STAGE, stateMachine.transactionTree.getCurrentTransactionId(), `::${stageToProcess.stage.nextState}`, [
                [`current state`, state == null ? undefined : JSON.stringify(state)]
            ]);
        });
    }

    createActionTransactionRequest(stateMachine: StateMachineImpl<any, any, any>, transition: SmTransition, actions: any, reactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, onStart: ICallback): TransactionRequest {
        return this.doEnrich(stateMachine, {
            name: `=>${transition.actionName}`,
            onStart: {
                metadata: `[start-action]>${transition.actionName}`,
                value: onStart,
            },
            reactionsProducer: () => this.reactionsAsCallbacks(stateMachine, reactions, actions),
            doChain: {
                metadata: `[request-stage]::${transition.transition.nextState}`,
                value: () => {
                    StateMachineLogger.log(stateMachine.data.name, stateMachine._status, stateMachine.eventThread.getCurrentStageName(), stateMachine.eventThread.getCurrentActionName(), EventType.TR_CHAIN, stateMachine.transactionTree.getCurrentTransactionId(), `//::${transition.transition.nextState}`);
                    return this.createStageTransactionRequest(stateMachine, {
                        description: `=>${transition.actionName}`,
                        eventType: EventType.STAGE,
                        stage: transition.transition,
                        type: ToProcessType.STAGE
                    });
                }
            },
            onReactionsProcessed: (reactionsProcessed)=>this.onReactionsProcessed(stateMachine, reactionsProcessed)
        })
    }

    createNormalStageTransactionRequest(stateMachine: StateMachineImpl<any, any, any>, stage: Stage, actions: any, reactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, onStart: ICallback): TransactionRequest {
        return this.doEnrich(stateMachine, {
            name: `::${stage.nextState}`,
            onStart: {
                metadata: `[start-stage]>`,
                value: onStart
            },
            reactionsProducer: () => this.reactionsAsCallbacks(stateMachine, reactions, actions),
            onReactionsProcessed: (reactionsProcessed)=>this.onReactionsProcessed(stateMachine, reactionsProcessed)
        });
    }

    createForkTransactionRequest(stateMachine: StateMachineImpl<any, any, any>, stage: Stage, stageDef: StageDef<any, any, any>): TransactionRequest {
        return this.doEnrich(stateMachine, {
            name: `->::${stage.nextState}`,
            reactionsProducer: () => [{
                metadata: {
                    name: `([fork]::${stage.nextState})`,
                    executionType: ListenerType.ONCE
                },
                value: () => stateMachine.fork(
                    stage,
                    (actions) => stageDef.deferredInfo.deferrer(actions, stage.data),
                    stageDef.deferredInfo.joinsInto
                )
            }],
            onReactionsProcessed: (reactionsProcessed)=>this.onReactionsProcessed(stateMachine, reactionsProcessed)
        })
    }


    createJoinTransactionRequest(stateMachine: StateMachineImpl<any, any, any>, stage: Stage, parentSm: StateMachineImpl<any, any, any>): TransactionRequest {
        return this.doEnrich(stateMachine, {
            name: `<-::${stage.nextState}`,
            reactionsProducer: () => [{
                metadata: {
                    name: `[stop-child-fork]`,
                    executionType: ListenerType.ONCE
                },
                value: () => {
                    StateMachineLogger.log(stateMachine.data.name, stateMachine._status, stateMachine.eventThread.getCurrentStageName(), stateMachine.eventThread.getCurrentActionName(), EventType.FORK_STOP, stateMachine.transactionTree.getCurrentTransactionId(), `!::${stage.nextState}`);
                    stateMachine.requestStage({
                        stage: {nextState: 'stop'},
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
                        description: `<=${stage.nextState}`,
                        eventType: EventType.FORK_JOIN,
                        type: ToProcessType.STAGE
                    });
                }
            }),
            onReactionsProcessed: (reactionsProcessed)=>this.onReactionsProcessed(stateMachine, reactionsProcessed)
        })
    }

    private onReactionsProcessed(stateMachine: StateMachineImpl<any, any, any>, processedReactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>): void {
        return stateMachine.deleteListeners(processedReactions
            .filter(it => it.metadata.executionType === ListenerType.ONCE)
            .map(it => it.metadata.name));
    }

    private doEnrich(stateMachine: StateMachineImpl<any, any, any>, toEnrich: TransactionRequest): TransactionRequest {
        return TransactionRequests.enrich(
            TransactionRequests.enrich(
                toEnrich,
            'onDone', (tx) => this.doLog(stateMachine, tx, EventType.TR_CLOSE)),
            'onStart', (tx) => this.doLog(stateMachine, tx, EventType.TR_OPEN)
        );
    }


    private doLog(stateMachine: StateMachineImpl<any, any, any>, transaction: Transaction, eventType: EventType) {
        StateMachineLogger.log(stateMachine.data.name, stateMachine._status, stateMachine.eventThread.getCurrentStageName(), stateMachine.eventThread.getCurrentActionName(), eventType, transaction.getId(), transaction.getThisName());
    }

    private reactionsAsCallbacks(stateMachine: StateMachineImpl<any, any, any>, reactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, actions: any) {
        return reactions.map(it => ({
            metadata: it.metadata,
            value: () => it.value(actions, {sm: stateMachine})
        }));
    }
}
