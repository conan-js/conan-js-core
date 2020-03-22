import {ListenerType, OnEventCallback, SmListener, SmListenerDefLike} from "./stateMachineListeners";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {EventType} from "./stateMachineLogger";
import {State, StateDef} from "./state";
import {IConsumer, IFunction, WithMetadataArray} from "../conan-utils/typesHelper";
import {ListenerDefType, ListenerMetadata} from "./stateMachineCore";
import {StateMachineBase} from "./stateMachineBase";
import {SmOrchestrator} from "./smOrchestrator";
import {TransactionRequest} from "../conan-tx/transaction";
import {StateMachineTx} from "./stateMachineTx";
import {SmRequestStrategy} from "./smRequestStrategy";

export interface StateMachineCore<SM_ON_LISTENER extends SmListener> {
    getStateDef(name: string): StateDef<any, any, any>;

    log(eventType: EventType, details?: string, additionalLines?: [string, string][]): void;

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType): this;

    getEvents(): SerializedSmEvent[];

    getStateData(): any;

    createReactions(eventName: string, type: ListenerDefType): WithMetadataArray<OnEventCallback<any>, ListenerMetadata>;

    deleteListeners(listenerNames: string[], type: ListenerDefType): void;

    getCurrentStageName(): string;

    getCurrentTransitionName(): string;
}


export interface StateMachine<SM_ON_LISTENER extends SmListener> extends StateMachineCore<SM_ON_LISTENER>{
    requestStage(state: State): void;

    requestTransition(transition: SmTransition): this;

    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void;
}

export interface StateMachineEndpoint {
    moveToState (stage: State): void ;

    moveToTransition (transition: SmTransition): void;
}

export class StateMachineImpl<
    SM_ON_LISTENER extends SmListener,
> extends StateMachineBase<SM_ON_LISTENER> {
    private readonly orchestrator: SmOrchestrator;
    private readonly requestStrategy: SmRequestStrategy;

    constructor(
        stateMachineCore: StateMachineCore<SM_ON_LISTENER>,
        private txConsumer: IConsumer<TransactionRequest>,
        private Orchestrator$: IFunction<StateMachine<any>, SmOrchestrator>,
        private RequestStrategy$: IFunction<StateMachine<any>, SmRequestStrategy>,
        private txFactory: StateMachineTx
    ) {
        super(stateMachineCore);
        this.orchestrator = Orchestrator$(this);
        this.requestStrategy = RequestStrategy$(this);
    }

    requestStage(state: State): void {
        this.txConsumer(this.txFactory.createStageTxRequest(state, this.orchestrator, this.requestStrategy));
    }

    requestTransition(transition: SmTransition): this {
        this.txConsumer(this.txFactory.createActionTxRequest(transition, this.orchestrator, this.requestStrategy));
        return this;
    }


    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void {
        throw new Error('TBI')

    }
}
