import {Strings} from "../../conan-utils/strings";
import {StateMachine} from "../stateMachine";
import {TransactionTree} from "../../conan-tx/transactionTree";
import {ForcedEvent, SmTransactions} from "./smTransactions";
import {State} from "../core/state";
import {ListenerDefType, SmListenerDefLike, SmListenerDefLikeParser} from "../events/stateMachineListeners";
import {ICallback, WithMetadataArray} from "../../conan-utils/typesHelper";
import {StateMachineController} from "../stateMachineController";
import {EventType} from "../logging/stateMachineLogger";
import {SmTransition} from "../events/stateMachineEvents";
import {ForkService} from "../services/forkService";
import {ReactorFactory} from "../reactions/reactorFactory";
import {Reaction, ReactionMetadata, ReactionType} from "../reactions/reactor";
import {StateDef} from "../core/stateDef";

export class SmOrchestrator {
    public stateMachineTx: SmTransactions;
    public forkService: ForkService;

    requestState<T=any>(stateMachineController: StateMachineController<any>, state: State<any, T>, txTree: TransactionTree) {
        txTree.createOrQueueTransaction(
            this.stateMachineTx.createStateTxRequest(state, stateMachineController, txTree),
            () => null,
            () => null
        );
    }

    requestTransition(stateMachineController: StateMachineController<any>, transition: SmTransition, txTree: TransactionTree) {
        txTree.createOrQueueTransaction(
            this.stateMachineTx.createActionTxRequest(transition, stateMachineController, txTree),
            () => null,
            () => null
        );
    }

    runIf(stateMachineController: StateMachineController<any>, toRun: SmListenerDefLike<any>, txTree: TransactionTree,) {
        this.runNow(stateMachineController, toRun, txTree, false);
    }

    runNow(stateMachineController: StateMachineController<any>, toRun: SmListenerDefLike<any>, txTree: TransactionTree, throwError: boolean = true) {
        let listener = new SmListenerDefLikeParser().parse(toRun, ReactionType.ONCE);
        stateMachineController.log(EventType.FORCE_RUN, `${listener.metadata.name}`);
        let currentState: string = stateMachineController.getCurrentStateName();
        let currentEvent: string = Strings.camelCaseWithPrefix('on', currentState);

        if (currentEvent in listener.value) {
            txTree.createOrQueueTransaction(this.stateMachineTx.forceEvent(stateMachineController, {
                    logic: (listener.value as any)[currentEvent],
                    stateDef: stateMachineController.getStateDef(currentState),
                    state: {
                        name: currentState,
                        data: stateMachineController.getStateData()
                    },
                    description: `!${currentEvent}`
                },
                txTree
                ),
                () => null,
                () => null
            );
        } else {
            if (throwError){
                throw new Error(`${stateMachineController.getName()} can't run now the listener with states: ${Object.keys(listener.value)} it does not match the current state: ${currentState}`)
            }
        }
    }

    moveToState<T=any>(stateMachineController: StateMachineController<any>, state: State<any, T>): void {
        if (! stateMachineController.getStateDef(state.name)) {
            throw new Error(`can't move the sm: [${stateMachineController.getName()}] to ${state} as this state does not exist in this SM`);
        }
        stateMachineController.moveToState(state);
        stateMachineController.log(EventType.STAGE, `::${state.name}`, [
            [`::${state.name}`, state.data == null ? undefined : state.data]
        ]);
    }

    createStateReactions(stateMachineController: StateMachineController<any>, state: State<any, any>, txTree: TransactionTree,): WithMetadataArray<ICallback, ReactionMetadata> {
        let eventName = Strings.camelCaseWithPrefix('on', state.name);
        return this.createReactions(
            stateMachineController,
            eventName,
            ListenerDefType.LISTENER,
            ReactorFactory.createStateReactors(
                stateMachineController,
                state,
                stateMachineController.getStateDef(state.name),
                this
            ),
            txTree
        )
    }

    createForcedEventReactions(stateMachineController: StateMachineController<any>, forcedEvent: ForcedEvent): WithMetadataArray<ICallback, ReactionMetadata> {
        return [{
            metadata: {
                executionType: ReactionType.ONCE,
                name: forcedEvent.description
            },
            value: () => forcedEvent.logic(ReactorFactory.createStateReactors(stateMachineController, forcedEvent.state, forcedEvent.stateDef, this))
        }]
    }

    createForkReactions(state: State<any, any>, stateMachineController: StateMachineController<any>) {
        return [{
            metadata: {
                executionType: ReactionType.ONCE,
                name: `fork-${state.name}`
            },
            value: () => stateMachineController.assertForkable((forkSm)=>{
                this.forkService.startFork(
                    forkSm,
                    stateMachineController,
                    state
                );
            })
        }]

    }

    createTransitionReactions(stateMachine: StateMachine<any>, transition: SmTransition, transactionTree: TransactionTree): WithMetadataArray<ICallback, ReactionMetadata> {
        return this.createReactions(
            stateMachine,
            Strings.camelCaseWithPrefix('on', transition.transitionName),
            ListenerDefType.INTERCEPTOR,
            transition.payload,
            transactionTree
        )
    }

    createReactions(stateMachine: StateMachine<any>, eventName: string, type: ListenerDefType, actions: any, transactionTree: TransactionTree): WithMetadataArray<ICallback, ReactionMetadata> {
        return this.reactionsAsCallbacks(stateMachine.createReactions(eventName, type, transactionTree), actions)
    }

    onReactionsProcessed(stateMachine: StateMachine<any>, reactionsProcessed: WithMetadataArray<Reaction<any>, ReactionMetadata>, type: ListenerDefType, transactionTree: TransactionTree): any {
        this.deleteOnceListenersUsed(stateMachine, reactionsProcessed, type, transactionTree)
    }

    moveToTransition(stateMachineController: StateMachineController<any>, transition: SmTransition): void {
        stateMachineController.moveToTransition(transition);
        stateMachineController.log(EventType.ACTION, `=>${transition.transitionName}`, [
            [`=>${transition.transitionName}`, transition.payload == null ? undefined : transition.payload]
        ]);
    }

    onTransitionRequestFromActions(stateMachineController: StateMachineController<any>, methodName: string, nextState: State, payload: any) {
        stateMachineController.ifForkable((forkSm)=>{
            forkSm.runIf(['fork::waiting=>joinBack', {
                onWaiting: (next)=> next.paths.joinBack()
            }])
        });
        let nextStateDef: StateDef<any> = stateMachineController.getStateDef(nextState.name);
        if (nextStateDef == null) {
            throw new Error('unexpected error');
        } else {
            stateMachineController.requestTransition({
                transitionName: methodName,
                ...payload ? {payload: payload} : undefined,
                into: nextState,
            });
        }
    }

    private reactionsAsCallbacks(reactions: WithMetadataArray<Reaction<any>, ReactionMetadata>, actions: any): WithMetadataArray<ICallback, ReactionMetadata> {
        return reactions.map(it => ({
            metadata: it.metadata,
            value: () => it.value(actions)
        }));
    }

    private deleteOnceListenersUsed(stateMachine: StateMachine<any>, reactionsProcessed: WithMetadataArray<Reaction<any>, ReactionMetadata>, type: ListenerDefType, transactionTree: TransactionTree): void {
        stateMachine.deleteListeners(
            reactionsProcessed
                .filter(it => it.metadata.executionType === ReactionType.ONCE)
                .map(it => it.metadata.name)
            , type, transactionTree);
    }
}
