import {ListenerType, OnEventCallback, SmListener, SmListenerDefLike} from "./stateMachineListeners";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {EventType} from "./stateMachineLogger";
import {State, StateDef} from "./state";
import {WithMetadataArray} from "../conan-utils/typesHelper";
import {ListenerDefType, ListenerMetadata} from "./stateMachineCore";

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
