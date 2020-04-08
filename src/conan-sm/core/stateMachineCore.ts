import {State} from "./state";
import {IKeyValuePairs, WithMetadataArray} from "../../conan-utils/typesHelper";
import {
    ListenerDefType,
    SmListener,
    SmListenerDefLike
} from "../events/stateMachineListeners";
import {ListenersController} from "../events/listenersController";
import {SmEventThread} from "../events/smEventThread";
import {TransactionTree} from "../../conan-tx/transactionTree";
import {SerializedSmEvent, SmTransition} from "../events/stateMachineEvents";
import {StateMachineCoreRead} from "./stateMachineCoreReader";
import {StateMachineCoreWrite} from "./stateMachineCoreWriter";
import {ReactionMetadata, Reaction, ReactionType} from "../reactions/reactor";
import {StateDef} from "./stateDef";


export class StateMachineCore<
    SM_ON_LISTENER extends SmListener,
>  implements StateMachineCoreWrite, StateMachineCoreRead<SM_ON_LISTENER>{
    private readonly eventThread: SmEventThread = new SmEventThread();

    constructor(
        readonly name: string,
        public readonly listeners: ListenersController<SM_ON_LISTENER>,
        public readonly interceptors: ListenersController<SM_ON_LISTENER>,
        public readonly stageDefsByKey: IKeyValuePairs<StateDef<any>>,
    ) {
    }

    getStateData(): any {
        return this.eventThread.currentStateEvent.data;
    }

    getStateName (): string{
        return this.eventThread.currentStateEvent.name;
    }

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ReactionType = ReactionType.ALWAYS): this {
        this.listeners.addListener(this, listener, type);
        return this;
    }

    addInterceptor(interceptor: SmListenerDefLike<SM_ON_LISTENER>, type: ReactionType = ReactionType.ALWAYS): this {
        this.interceptors.addListener(this, interceptor, type);
        return this;
    }

    createReactions(eventName: string, type: ListenerDefType, txTree: TransactionTree): WithMetadataArray<Reaction<any>, ReactionMetadata> {
        return this.getListenerController(type).createReactions(this, txTree, eventName);
    }

    deleteListeners(listenerNames: string[], type: ListenerDefType, txTree: TransactionTree) {
        this.getListenerController(type).deleteListeners(this, txTree, listenerNames);
    }

    getStateDef(name: string): StateDef<any> {
        return this.stageDefsByKey [name];
    }

    getEvents(): SerializedSmEvent [] {
        return this.eventThread.serialize();
    }

    moveToState (state: State<any, any>): void {
        this.eventThread.addStageEvent(state);
    }

    moveToTransition (transition: SmTransition): void {
        this.eventThread.addActionEvent(transition);
    }

    getCurrentStateName (): string {
        return this.eventThread.getCurrentStateName();
    }

    getCurrentTransitionName (): string {
        return this.eventThread.getCurrentTransitionName();
    }

    private getListenerController(type: ListenerDefType) {
        return type === ListenerDefType.INTERCEPTOR ? this.interceptors : this.listeners;
    }

    getName(): string {
        return this.name;
    }

    getState(): State {
        return this.eventThread.getCurrentState();
    }

    getEventThread(): SmEventThread {
        return this.eventThread;
    }

}
