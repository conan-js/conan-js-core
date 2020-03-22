import {ListenerDefType, ListenerMetadata, StateMachine} from "./stateMachine";
import {ListenerType, OnEventCallback, SmListener, SmListenerDefLike} from "./stateMachineListeners";
import {State, StateDef} from "./state";
import {IConsumer, IFunction, WithMetadataArray} from "../conan-utils/typesHelper";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {TransactionRequest} from "../conan-tx/transaction";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {StateMachineTx} from "./stateMachineTx";
import {SmOrchestrator} from "./smOrchestrator";

export interface StateMachineController<SM_ON_LISTENER extends SmListener> {
    requestStage(state: State): void;

    requestTransition(transition: SmTransition): this;

    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void;

    getStateDef(name: string): StateDef<any, any, any>;

    log (eventType: EventType, details?: string, additionalLines?: [string, string][]): void;

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType): this;

    getEvents(): SerializedSmEvent[];

    getStateData(): any;

    moveToState (stage: State): void;

    createReactions(eventName: string, type: ListenerDefType): WithMetadataArray<OnEventCallback<any>, ListenerMetadata>;

    deleteListeners(listenerNames: string[], type: ListenerDefType): void;

    moveToAction(transition: SmTransition): void;
}

export class StateMachineControllerImpl<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS = any
> implements StateMachineController<SM_ON_LISTENER>{
    private txFactory: StateMachineTx;

    constructor(
        private stateMachine: StateMachine<SM_ON_LISTENER, SM_IF_LISTENER, ACTIONS>,
        private txConsumer: IConsumer<TransactionRequest>,
        private txInitializer: IFunction<StateMachineController<any>, SmOrchestrator>,
        private logger: StateMachineLogger
    ) {
        this.txFactory = new StateMachineTx(
            txInitializer(this),
            logger
        );
    }

    requestStage(state: State): void {
        let stageName = state.name;
        if (this.stateMachine.getStageDef(state.name) == null) {
            throw new Error(`can't move sm: [${this.stateMachine.stateMachineDef.name}] to ::${stageName} and is not a valid stage, ie one of: (${Object.keys(this.stateMachine.stateMachineDef.stageDefsByKey).join(', ')})`)
        }

        this.txConsumer(this.txFactory.createStageTxRequest(state));
    }

    requestTransition(transition: SmTransition): this {
        this.txConsumer(
            this.txFactory.createActionTxRequest(transition)
        );

        return this;
    }


    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void {
        let currentStageName = this.stateMachine.getCurrentStageName();
        this.stateMachine.createReactions(
            currentStageName,
            ListenerDefType.LISTENER
        )
    }


    getStateData(): any {
        return this.stateMachine.getStateData();
    }

    getEvents(): SerializedSmEvent[] {
        return this.stateMachine.getEvents();
    }

    log (eventType: EventType, details?: string, additionalLines?: [string, string][]): void {
        this.stateMachine.log(eventType, details, additionalLines)
    }

    getStateDef(name: string): StateDef<any, any, any> {
        return this.stateMachine.getStageDef(name);
    }

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.stateMachine.addListener(listener, type);
        return this;
    }

    moveToState(state: State): void {
        this.stateMachine.moveToState(state);
    }

    createReactions(eventName: string, type: ListenerDefType): WithMetadataArray<OnEventCallback<any>, ListenerMetadata> {
        return this.stateMachine.createReactions(eventName, type);
    }

    deleteListeners(listenerNames: string[], type: ListenerDefType): void {
        this.stateMachine.deleteListeners(listenerNames, type);
    }

    moveToAction(transition: SmTransition): void {
        this.stateMachine.moveToTransition(transition);
    }
}
//
