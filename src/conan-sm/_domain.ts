import {SmListener, SmListenerDefLike} from "./events/stateMachineListeners";
import {ReactionType} from "./reactions/reactor";

export interface SmEventsPublisher<
    SM_ON_LISTENER extends SmListener,
    SM_INTERCEPTOR extends SmListener,
> {
    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type?: ReactionType): this;

    addInterceptor (interceptor: SmListenerDefLike<SM_INTERCEPTOR>): this;
}


