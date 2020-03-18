import {Transaction, TransactionRequest} from "../conan-tx/transaction";
import {Stage, StageDef} from "./stage";
import {ListenerMetadata, StageToProcess, StateMachine, ToProcessType} from "./stateMachine";
import {ICallback, WithMetadataArray} from "../conan-utils/typesHelper";
import {ListenerType, OnEventCallback} from "./stateMachineListeners";
import {SmTransition} from "./stateMachineEvents";
import {Strings} from "../conan-utils/strings";
import {TransactionRequests} from "../conan-tx/transactionRequests";
import {StateMachineTree} from "./stateMachineTree";
import {EventType, StateMachineLoggerHelper} from "./stateMachineLogger";

export class SmTransactionsRequests {
    createStageTransactionRequest(stateMachineTree: StateMachineTree<any>, stageToProcess: StageToProcess): TransactionRequest {
        let intoStageName = stageToProcess.stage.stateName;
        let stageDef = stateMachineTree.getStageDef(intoStageName);
        let isDeferredStage: boolean = !!(stageDef && stageDef.deferredInfo);
        let eventName = Strings.camelCaseWithPrefix('on', stageToProcess.stage.stateName);

        let isOnForkJoiningBack = stateMachineTree.isJoiningBackOn(stageToProcess.stage.stateName);
        let actions = stateMachineTree.createActions(stageToProcess.stage.stateName, stageToProcess.stage.data);

        if (isDeferredStage) {
            return this.createForkTransactionRequest(stateMachineTree, stageToProcess.stage, stageDef);
        }

        if (isOnForkJoiningBack) {
            return this.createJoinTransactionRequest(stateMachineTree, stageToProcess.stage);
        }

        return this.createNormalStageTransactionRequest(stateMachineTree, stageToProcess.stage, actions, stateMachineTree.createListenerReactions(eventName), () => {
            stateMachineTree.addStageEvent(stageToProcess.stage);
            let state = stateMachineTree.getStateData();
            stateMachineTree.log(EventType.STAGE,  `::${stageToProcess.stage.stateName}`, [
                [`current state`, state == null ? undefined : JSON.stringify(state)]
            ]);
        });
    }

    createActionTransactionRequest(stateMachineTree: StateMachineTree<any>, transition: SmTransition, actions: any, reactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, onStart: ICallback): TransactionRequest {
        return this.doEnrich(stateMachineTree, {
            name: `=>${transition.transitionName}`,
            onStart: {
                metadata: `[start-action]>${transition.transitionName}`,
                value: onStart,
            },
            reactionsProducer: () => this.reactionsAsCallbacks(stateMachineTree, reactions, actions),
            doChain: {
                metadata: `[request-stage]::${transition.transition.stateName}`,
                value: () => {
                    stateMachineTree.log(EventType.TR_CHAIN,  `//::${transition.transition.stateName}`);
                    return this.createStageTransactionRequest(stateMachineTree, {
                        description: `=>${transition.transitionName}`,
                        eventType: EventType.STAGE,
                        stage: transition.transition,
                        type: ToProcessType.STAGE
                    });
                }
            },
            onReactionsProcessed: (reactionsProcessed)=>this.onReactionsProcessed(stateMachineTree, reactionsProcessed)
        })
    }

    createNormalStageTransactionRequest(stateMachineTree: StateMachineTree<any>, stage: Stage, actions: any, reactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, onStart: ICallback): TransactionRequest {
        return this.doEnrich(stateMachineTree, {
            name: `::${stage.stateName}`,
            onStart: {
                metadata: `[start-stage]>`,
                value: onStart
            },
            reactionsProducer: () => this.reactionsAsCallbacks(stateMachineTree, reactions, actions),
            onReactionsProcessed: (reactionsProcessed)=>this.onReactionsProcessed(stateMachineTree, reactionsProcessed)
        });
    }

    createForkTransactionRequest(stateMachineTree: StateMachineTree<any>, stage: Stage, stageDef: StageDef<any, any, any>): TransactionRequest {
        return this.doEnrich(stateMachineTree, {
            name: `->::${stage.stateName}`,
            reactionsProducer: () => [{
                metadata: {
                    name: `([fork]::${stage.stateName})`,
                    executionType: ListenerType.ONCE
                },
                value: () => {
                    let fork = stateMachineTree.fork(
                        stage,
                        (actions) => stageDef.deferredInfo.deferrer(actions, stage.data),
                        stageDef.deferredInfo.joinsInto
                    );

                    return fork;
                }
            }],
            onReactionsProcessed: (reactionsProcessed)=>this.onReactionsProcessed(stateMachineTree, reactionsProcessed)
        })
    }


    createJoinTransactionRequest(stateMachineTree: StateMachineTree<any>, stage: Stage): TransactionRequest {
        return this.doEnrich(stateMachineTree, {
            name: `<-::${stage.stateName}`,
            reactionsProducer: () => [{
                metadata: {
                    name: `[stop-child-fork]`,
                    executionType: ListenerType.ONCE
                },
                value: () => {
                    stateMachineTree.log(EventType.FORK_STOP,  `!::${stage.stateName}`);
                    stateMachineTree.requestStage({
                        stage: {stateName: 'stop'},
                        description: '::stop',
                        eventType: EventType.FORK_STOP,
                        type: ToProcessType.STAGE
                    });
                }
            }],
            onDone: ({
                metadata: `[parent-join]`, value: (): void => {
                    stateMachineTree.parentInfo.parent.joinBack({
                        stage: stage,
                        description: `<=${stage.stateName}`,
                        eventType: EventType.FORK_JOIN,
                        type: ToProcessType.STAGE
                    });
                }
            }),
            onReactionsProcessed: (reactionsProcessed)=>this.onReactionsProcessed(stateMachineTree, reactionsProcessed)
        })
    }

    private onReactionsProcessed(stateMachineTree: StateMachineTree<any>, processedReactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>): void {
        return stateMachineTree.deleteListeners(processedReactions
            .filter(it => it.metadata.executionType === ListenerType.ONCE)
            .map(it => it.metadata.name));
    }

    private doEnrich(stateMachineTree: StateMachineTree<any>, toEnrich: TransactionRequest): TransactionRequest {
        return TransactionRequests.enrich(
            TransactionRequests.enrich(
                toEnrich,
            'onDone', (tx) => this.doLog(stateMachineTree.root, tx, EventType.TR_CLOSE)),
            'onStart', (tx) => this.doLog(stateMachineTree.root, tx, EventType.TR_OPEN)
        );
    }


    private doLog(stateMachine: StateMachine<any, any, any>, transaction: Transaction, eventType: EventType) {
        StateMachineLoggerHelper.log(stateMachine.stateMachineDef.name, stateMachine._status, stateMachine.eventThread.getCurrentStageName(), stateMachine.eventThread.getCurrentTransitionName(), eventType, transaction.getId(), transaction.getThisName());
    }

    private reactionsAsCallbacks(stateMachineTree: StateMachineTree<any>, reactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, actions: any) {
        return reactions.map(it => ({
            metadata: it.metadata,
            value: () => it.value(actions, {sm: stateMachineTree})
        }));
    }
}
