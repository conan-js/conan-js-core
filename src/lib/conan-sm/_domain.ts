import {ListenerType, SmListener, SmListenerDefLike} from "./stateMachineListeners";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {StageDef} from "./stage";

export interface SmEventsPublisher<
    SM_ON_LISTENER extends SmListener,
    SM_INTERCEPTOR extends SmListener,
> {
    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type?: ListenerType): this;

    addInterceptor (interceptor: SmListenerDefLike<SM_INTERCEPTOR>): this;
}

export interface SmRequestsQueue {
    requestTransition(transition: SmTransition): this;
}

export interface SmController<
    SM_ON_LISTENER extends SmListener,
    SM_INTERCEPTOR extends SmListener,
> extends SmEventsPublisher<SM_ON_LISTENER, SM_INTERCEPTOR>, SmRequestsQueue {

    stop(): this;

    getEvents(): SerializedSmEvent [];

    getStageDef(name: string): StageDef<any, any, any>;
}
