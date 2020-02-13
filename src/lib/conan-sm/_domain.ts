import {ListenerType, SmListener, SmListenerDefLike} from "./stateMachineListeners";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {StageDef} from "./stage";

export interface SmEventsPublisher<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
> {
    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type?: ListenerType): this;
}

export interface SmRequestsQueue<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
> {
    requestTransition(transition: SmTransition): this;
}

export interface SmController<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
> extends SmEventsPublisher<SM_ON_LISTENER, SM_IF_LISTENER>, SmRequestsQueue<SM_ON_LISTENER, SM_IF_LISTENER> {

    stop(): this;

    getEvents(): SerializedSmEvent [];

    getStageDef(name: string): StageDef<any, any, any>;
}
