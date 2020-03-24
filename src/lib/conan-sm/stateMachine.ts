import {ListenerType, OnEventCallback, SmListener, SmListenerDefLike} from "./stateMachineListeners";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {State, StateDef} from "./state";
import {IFunction, WithMetadata, WithMetadataArray} from "../conan-utils/typesHelper";
import {SmOrchestrator} from "./smOrchestrator";
import {StateMachineTx} from "./stateMachineTx";
import {SmRequestStrategy} from "./smRequestStrategy";
import {Strings} from "../conan-utils/strings";
import {StateMachineCoreImpl} from "./stateMachineCore";
import {TransactionTree} from "../conan-tx/transactionTree";

export interface ListenerMetadata {
    name: string,
    executionType: ListenerType,
}

export enum ListenerDefType {
    LISTENER = 'LISTENER',
    INTERCEPTOR = 'INTERCEPTOR',
}

export interface StateMachineCore<SM_ON_LISTENER extends SmListener> {
    getStateDef(name: string): StateDef<any, any, any>;

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType): this;

    getEvents(): SerializedSmEvent[];

    getStateData(): any;

    createReactions(eventName: string, type: ListenerDefType, txTree: TransactionTree): WithMetadataArray<OnEventCallback<any>, ListenerMetadata>;

    deleteListeners(listenerNames: string[], type: ListenerDefType, txTree: TransactionTree): void;

    getCurrentStageName(): string;

    getCurrentTransitionName(): string;
}


export interface StateMachine<SM_ON_LISTENER extends SmListener> extends StateMachineCore<SM_ON_LISTENER>, StateMachineLogger {
    requestStage(state: State): void;

    requestTransition(transition: SmTransition): this;

    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void;
}

export interface StateMachineEndpoint {
    moveToState(stage: State): void;

    moveToTransition(transition: SmTransition): void;
}

export class StateMachineImpl<
    SM_ON_LISTENER extends SmListener,
> implements StateMachine<SM_ON_LISTENER> {
    private readonly orchestrator: SmOrchestrator;
    private readonly requestStrategy: SmRequestStrategy;

    constructor(
        private stateMachineCore: StateMachineCoreImpl<SM_ON_LISTENER, any>,
        private txTree: TransactionTree,
        private Orchestrator$: IFunction<StateMachine<any>, SmOrchestrator>,
        private RequestStrategy$: IFunction<StateMachine<any>, SmRequestStrategy>,
        private txFactory: StateMachineTx,
        private readonly logger: StateMachineLogger
    ) {
        this.orchestrator = Orchestrator$(this);
        this.requestStrategy = RequestStrategy$(this);
    }

    requestStage(state: State): void {
        this.txTree.createOrQueueTransaction(
            this.txFactory.createStageTxRequest(state, this.orchestrator, this.stateMachineCore, this, this.txTree, this.requestStrategy),
            () => null,
            () => null
        );
    }

    requestTransition(transition: SmTransition): this {
        this.txTree.createOrQueueTransaction(
            this.txFactory.createActionTxRequest(transition, this.orchestrator, this.stateMachineCore, this, this.txTree, this.requestStrategy),
            () => null,
            () => null
        );
        return this;
    }


    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void {
        let currentState: string = this.stateMachineCore.getCurrentStageName();
        let currentEvent: string = Strings.camelCaseWithPrefix('on', currentState);

        if (currentEvent in toRun) {
            this.txTree.createOrQueueTransaction(this.txFactory.forceEvent(this, {
                    logic: (toRun as any)[currentEvent],
                    stateDef: this.stateMachineCore.getStateDef(currentState),
                    state: {
                        name: currentState,
                        data: this.stateMachineCore.getStateData()
                    },
                    description: `!${currentEvent}`
                },
                this.orchestrator,
                this.requestStrategy,
                this.txTree
                ),
                () => null,
                () => null
            );
        } else {
            throw new Error(`can't run now the listener with states: ${Object.keys(toRun)} it does not match the current state: ${currentState}`)
        }
    }

    addListener(listener: [string, SM_ON_LISTENER] | SM_ON_LISTENER, type: ListenerType): this {
        return undefined;
    }

    createReactions(eventName: string, type: ListenerDefType): WithMetadata<(toConsume: any) => void, ListenerMetadata>[] {
        return this.stateMachineCore.createReactions(eventName, type, this.txTree);
    }

    deleteListeners(listenerNames: string[], type: ListenerDefType): void {
        this.stateMachineCore.deleteListeners(listenerNames, type, this.txTree);
    }

    getCurrentStageName(): string {
        return this.stateMachineCore.getCurrentStageName();
    }

    getCurrentTransitionName(): string {
        return this.stateMachineCore.getCurrentTransitionName();
    }

    getEvents(): SerializedSmEvent[] {
        return this.stateMachineCore.getEvents();
    }

    getStateData(): any {
        return this.stateMachineCore.getStateData();
    }

    getStateDef(name: string): StateDef<any, any, any> {
        return this.stateMachineCore.getStateDef(name);
    }

    log(eventType: EventType, details?: string, additionalLines?: [string, string][]): void {
        this.logger.log(eventType, details, additionalLines);
    }
}
