import {ListenerType, SmListener, SmListenerDefLike} from "./core/stateMachineListeners";

export interface SmEventsPublisher<
    SM_ON_LISTENER extends SmListener,
    SM_INTERCEPTOR extends SmListener,
> {
    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type?: ListenerType): this;

    addInterceptor (interceptor: SmListenerDefLike<SM_INTERCEPTOR>): this;
}


