import {State, StateDef} from "../state";
import {IKeyValuePairs, WithMetadataArray} from "../../conan-utils/typesHelper";
import {ListenerType, OnEventCallback, SmListener, SmListenerDefLike} from "../stateMachineListeners";
import {SerializedSmEvent, SmTransition} from "../stateMachineEvents";
import {ListenersController} from "../listenersController";
import {SmEventThread} from "../smEventThread";
import {ListenerDefType, ListenerMetadata} from "../stateMachine";
import {TransactionTree} from "../../conan-tx/transactionTree";

export interface StateMachineCoreRead<SM_ON_LISTENER extends SmListener> {
    getStateDef(name: string): StateDef<any, any, any>;

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, txTree: TransactionTree, type: ListenerType): this;

    getEvents(): SerializedSmEvent[];

    getStateData(): any;

    createReactions(eventName: string, type: ListenerDefType, txTree: TransactionTree): WithMetadataArray<OnEventCallback<any>, ListenerMetadata>;

    deleteListeners(listenerNames: string[], type: ListenerDefType, txTree: TransactionTree): void;

    getCurrentStageName(): string;

    getCurrentTransitionName(): string;
}

export interface StateMachineCoreWrite {
    moveToState(stage: State): void;

    moveToTransition(transition: SmTransition): void;
}

export class StateMachineCore<
    SM_ON_LISTENER extends SmListener,
>  implements StateMachineCoreWrite, StateMachineCoreRead<SM_ON_LISTENER>{
    private readonly eventThread: SmEventThread = new SmEventThread();

    constructor(
        readonly name: string,
        private readonly listeners: ListenersController<SM_ON_LISTENER, any>,
        private readonly interceptors: ListenersController<SM_ON_LISTENER, any>,
        private readonly stageDefsByKey: IKeyValuePairs<StateDef<any, any, any, any>>,
    ) {
    }

    getStateData(): any {
        return this.eventThread.currentStageEvent.data;
    }

    getStateName (): string{
        return this.eventThread.currentStageEvent.name;
    }


    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, txTree: TransactionTree, type: ListenerType = ListenerType.ALWAYS): this {
        this.listeners.addListener(this, txTree, listener, type);
        return this;
    }

    addInterceptor(interceptor: SmListenerDefLike<SM_ON_LISTENER>, txTree: TransactionTree, type: ListenerType = ListenerType.ALWAYS): this {
        this.interceptors.addListener(this, txTree, interceptor, type);
        return this;
    }

    createReactions(eventName: string, type: ListenerDefType, txTree: TransactionTree): WithMetadataArray<OnEventCallback<any>, ListenerMetadata> {
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
