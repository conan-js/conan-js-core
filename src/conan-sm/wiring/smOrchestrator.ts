import {ICallback, ListenerType, OnEventCallback, SmListenerDefLike, State, WithMetadataArray} from "../..";
import {EventType} from "../stateMachineLogger";
import {SmTransition} from "../stateMachineEvents";
import {Strings} from "../../conan-utils/strings";
import {ListenerDefType, ListenerMetadata, StateMachine, StateMachineFacade} from "../stateMachine";
import {SmRequestStrategy} from "../actions/smRequestStrategy";
import {TransactionTree} from "../../conan-tx/transactionTree";
import {ForcedEvent, SmTransactions} from "./smTransactions";

export interface RuntimeInformation {
    txTree: TransactionTree,
    requestStrategy: SmRequestStrategy,
}

export class SmOrchestrator {
    public stateMachineTx: SmTransactions;

    requestState(stateMachineFacade: StateMachineFacade<any>, state: State, runtimeInfo: RuntimeInformation) {
        runtimeInfo.txTree.createOrQueueTransaction(
            this.stateMachineTx.createStateTxRequest(state, stateMachineFacade, runtimeInfo),
            () => null,
            () => null
        );
    }

    requestTransition(stateMachineFacade: StateMachineFacade<any>, transition: SmTransition, runtimeInfo: RuntimeInformation) {
        runtimeInfo.txTree.createOrQueueTransaction(
            this.stateMachineTx.createActionTxRequest(transition, stateMachineFacade, runtimeInfo),
            () => null,
            () => null
        );
    }

    runNow(stateMachineFacade: StateMachineFacade<any>, toRun: SmListenerDefLike<any>, runtimeInfo: RuntimeInformation) {
        let currentState: string = stateMachineFacade.getCurrentStageName();
        let currentEvent: string = Strings.camelCaseWithPrefix('on', currentState);

        if (currentEvent in toRun) {
            runtimeInfo.txTree.createOrQueueTransaction(this.stateMachineTx.forceEvent(stateMachineFacade, {
                    logic: (toRun as any)[currentEvent],
                    stateDef: stateMachineFacade.getStateDef(currentState),
                    state: {
                        name: currentState,
                        data: stateMachineFacade.getStateData()
                    },
                    description: `!${currentEvent}`
                },
                runtimeInfo
                ),
                () => null,
                () => null
            );
        } else {
            throw new Error(`can't run now the listener with states: ${Object.keys(toRun)} it does not match the current state: ${currentState}`)
        }
    }

    moveToState(stateMachineFacade: StateMachineFacade<any>, state: State): void {
        stateMachineFacade.log(EventType.STAGE, `::${state.name}`, [
            [`::${state.name}`, state.data == null ? undefined : state.data]
        ]);
        stateMachineFacade.moveToState(state);
    }

    createStateReactions(stateMachineFacade: StateMachineFacade<any>, state: State, runtimeInfo: RuntimeInformation): WithMetadataArray<ICallback, ListenerMetadata> {
        let eventName = Strings.camelCaseWithPrefix('on', state.name);
        return this.createReactions(
            stateMachineFacade,
            eventName,
            ListenerDefType.LISTENER,
            runtimeInfo.requestStrategy.stateActions(stateMachineFacade, state, stateMachineFacade.getStateDef(state.name)),
            runtimeInfo.txTree
        )
    }

    createForcedEventReactions(stateMachine: StateMachine<any>, forcedEvent: ForcedEvent, requestStrategy: SmRequestStrategy): WithMetadataArray<ICallback, ListenerMetadata> {
        return [{
            metadata: {
                executionType: ListenerType.ONCE,
                name: forcedEvent.description
            },
            value: () => forcedEvent.logic(requestStrategy.stateActions(stateMachine, forcedEvent.state, forcedEvent.stateDef))
        }]
    }

    createTransitionReactions(stateMachine: StateMachine<any>, transition: SmTransition, transactionTree: TransactionTree): WithMetadataArray<ICallback, ListenerMetadata> {
        return this.createReactions(
            stateMachine,
            Strings.camelCaseWithPrefix('on', transition.transitionName),
            ListenerDefType.INTERCEPTOR,
            {},
            transactionTree
        )
    }

    createReactions(stateMachine: StateMachine<any>, eventName: string, type: ListenerDefType, actions: any, transactionTree: TransactionTree): WithMetadataArray<ICallback, ListenerMetadata> {
        return this.reactionsAsCallbacks(stateMachine.createReactions(eventName, type, transactionTree), actions)
    }

    onReactionsProcessed(stateMachine: StateMachine<any>, reactionsProcessed: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, type: ListenerDefType, transactionTree: TransactionTree): any {
        this.deleteOnceListenersUsed(stateMachine, reactionsProcessed, type, transactionTree)
    }

    moveToTransition(stateMachineFacade: StateMachineFacade<any>, transition: SmTransition): void {
        stateMachineFacade.log(EventType.ACTION, `=>${transition.transitionName}`, [
            [`::${stateMachineFacade.getStateName()}=>${transition.transitionName}`, transition.payload == null ? undefined : transition.payload]
        ]);
        stateMachineFacade.moveToTransition(transition);
    }

    private reactionsAsCallbacks(reactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, actions: any): WithMetadataArray<ICallback, ListenerMetadata> {
        return reactions.map(it => ({
            metadata: it.metadata,
            value: () => it.value(actions)
        }));
    }

    private deleteOnceListenersUsed(stateMachine: StateMachine<any>, reactionsProcessed: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, type: ListenerDefType, transactionTree: TransactionTree): void {
        stateMachine.deleteListeners(
            reactionsProcessed
                .filter(it => it.metadata.executionType === ListenerType.ONCE)
                .map(it => it.metadata.name)
            , type, transactionTree);
    }
}
