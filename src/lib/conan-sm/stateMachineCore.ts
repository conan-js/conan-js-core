import {State, StateDef} from "./state";
import {IKeyValuePairs, WithMetadataArray} from "../conan-utils/typesHelper";
import {ListenerType, OnEventCallback, SmListener, SmListenerDefLike} from "./stateMachineListeners";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {EventType} from "./stateMachineLogger";
import {ListenersController} from "./listenersController";
import {SmEventThread} from "./smEventThread";
import {ListenerDefType, ListenerMetadata, StateMachineCore, StateMachineEndpoint} from "./stateMachine";
import {TransactionTree} from "../conan-tx/transactionTree";

export enum ToProcessType {
    STAGE = 'STAGE'
}

export interface StageToProcess extends BaseToProcess {
    type: ToProcessType.STAGE;
    stage: State;
}

interface BaseToProcess {
    eventType: EventType;
    type: ToProcessType;
    description: string;
}

export enum StateMachineStatus {
    PAUSED = 'PAUSED',
    STOPPED = 'STOPPED',
    IDLE = 'IDLE',
    RUNNING = 'RUNNING',
}


export class StateMachineCoreImpl<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS = any,
>  implements StateMachineEndpoint, StateMachineCore<SM_ON_LISTENER>{
    private readonly eventThread: SmEventThread = new SmEventThread();

    constructor(
        private readonly name: string,
        private readonly listeners: ListenersController<SM_ON_LISTENER, any>,
        private readonly interceptors: ListenersController<SM_IF_LISTENER, any>,
        private readonly stageDefsByKey: IKeyValuePairs<StateDef<any, any, any, any>>,
    ) {
    }

    getStateData(): any {
        return this.eventThread.currentStageEvent.data;
    }

    getStateName (): string{
        return this.eventThread.currentStageEvent.name;
    }


    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.listeners.addListener(listener, type);
        return this;
    }

    addInterceptor(interceptor: SmListenerDefLike<SM_IF_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.interceptors.addListener(interceptor, type);
        return this;
    }

    createReactions(eventName: string, type: ListenerDefType, txTree: TransactionTree): WithMetadataArray<OnEventCallback<ACTIONS>, ListenerMetadata> {
        return this.getListenerController(type).createReactions(this, txTree, eventName);
    }

    deleteListeners(listenerNames: string[], type: ListenerDefType, txTree: TransactionTree) {
        this.getListenerController(type).deleteListeners(this, txTree, listenerNames);
    }

    getStateDef(name: string): StateDef<any, any, any> {
        return this.stageDefsByKey [name];
    }

    getEvents(): SerializedSmEvent [] {
        return this.eventThread.serialize();
    }

    moveToState (stage: State): void {
        this.eventThread.addStageEvent(stage);
    }

    moveToTransition (transition: SmTransition): void {
        this.eventThread.addActionEvent(transition);
    }

    getCurrentStageName (): string {
        return this.eventThread.getCurrentStageName();
    }

    getCurrentTransitionName (): string {
        return this.eventThread.getCurrentTransitionName();
    }

    private getListenerController(type: ListenerDefType) {
        return type === ListenerDefType.INTERCEPTOR ? this.interceptors : this.listeners;
    }
}
