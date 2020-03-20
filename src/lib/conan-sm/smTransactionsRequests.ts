import {TransactionRequest} from "../conan-tx/transaction";
import {Stage} from "./stage";
import {ListenerDefType, ListenerMetadata, StateMachine} from "./stateMachine";
import {WithMetadataArray} from "../conan-utils/typesHelper";
import {ListenerType, OnEventCallback} from "./stateMachineListeners";
import {SmTransition} from "./stateMachineEvents";
import {EventType} from "./stateMachineLogger";
import {StateMachineController} from "./stateMachineController";
import {Strings} from "../conan-utils/strings";

export class SmTransactionsRequests {





    // createForkTransactionRequest(stateMachineTree: StateMachineTree<any>, stage: Stage, stageDef: StageDef<any, any, any>): TransactionRequest {
    //     return this.doEnrich(stateMachineTree, {
    //         name: `->::${stage.stateName}`,
    //         reactionsProducer: () => [{
    //             metadata: {
    //                 name: `([fork]::${stage.stateName})`,
    //                 executionType: ListenerType.ONCE
    //             },
    //             value: () => {
    //                 let fork = stateMachineTree.fork(
    //                     stage,
    //                     (actions) => stageDef.deferredInfo.deferrer(actions, stage.data),
    //                     stageDef.deferredInfo.joinsInto
    //                 );
    //
    //                 return fork;
    //             }
    //         }],
    //         onReactionsProcessed: (reactionsProcessed)=>this.onReactionsProcessed(stateMachineTree, reactionsProcessed)
    //     })
    // }

    // createJoinTransactionRequest(stateMachineTree: StateMachineTree<any>, stage: Stage): TransactionRequest {
    //     return this.doEnrich(stateMachineTree, {
    //         name: `<-::${stage.stateName}`,
    //         reactionsProducer: () => [{
    //             metadata: {
    //                 name: `[stop-child-fork]`,
    //                 executionType: ListenerType.ONCE
    //             },
    //             value: () => {
    //                 stateMachineTree.log(EventType.FORK_STOP,  `!::${stage.stateName}`);
    //                 stateMachineTree.requestStage({
    //                     stage: {stateName: 'stop'},
    //                     description: '::stop',
    //                     eventType: EventType.FORK_STOP,
    //                     type: ToProcessType.STAGE
    //                 });
    //             }
    //         }],
    //         onDone: ({
    //             metadata: `[parent-join]`, value: (): void => {
    //                 stateMachineTree.parentInfo.parent.joinBack({
    //                     stage: stage,
    //                     description: `<=${stage.stateName}`,
    //                     eventType: EventType.FORK_JOIN,
    //                     type: ToProcessType.STAGE
    //                 });
    //             }
    //         }),
    //         onReactionsProcessed: (reactionsProcessed)=>this.onReactionsProcessed(stateMachineTree, reactionsProcessed)
    //     })
    // }
    //
    // private onReactionsProcessed(stateMachineTree: StateMachineTree<any>, processedReactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>): void {
    //     return stateMachineTree.deleteListeners(processedReactions
    //         .filter(it => it.metadata.executionType === ListenerType.ONCE)
    //         .map(it => it.metadata.name));
    // }
    //
    // private doEnrich(stateMachineController: StateMachineController<any, any>, toEnrich: TransactionRequest): TransactionRequest {
    //     return TransactionRequests.enrich(
    //         TransactionRequests.enrich(
    //             toEnrich,
    //         'onDone', (tx) => this.doLog(stateMachineController.root, tx, EventType.TR_CLOSE)),
    //         'onStart', (tx) => this.doLog(stateMachineController.root, tx, EventType.TR_OPEN)
    //     );
    // }
    //
    //
    // private doLog(stateMachine: StateMachine<any, any, any>, transaction: Transaction, eventType: EventType) {
    //     StateMachineLoggerHelper.log(stateMachine.stateMachineDef.name, stateMachine._status, stateMachine.getCurrentStageName(), stateMachine.getCurrentTransitionName(), eventType, transaction.getId(), transaction.getThisName());
    // }
}
