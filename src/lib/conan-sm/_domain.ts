import {ListenerType, SmListener, SmListenerDef, SmListenerDefLike, SmListenerDefList} from "./stateMachineListeners";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {StageDef} from "./stage";
import {SyncStateMachineDef} from "./stateMachineTreeDefBuilder";
import {IKeyValuePairs} from "../conan-utils/typesHelper";
import {ParentStateMachineInfo} from "./stateMachineImpl";

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

export interface StateMachine<
    SM_ON_LISTENER extends SmListener,
    SM_INTERCEPTOR extends SmListener,
> extends SmEventsPublisher<SM_ON_LISTENER, SM_INTERCEPTOR>, SmRequestsQueue {
    stop(): this;

    getEvents(): SerializedSmEvent [];

    getStageDef(name: string): StageDef<any, any, any>;

    getStateData(): any;

    processAsap (listener: SmListenerDef<SM_ON_LISTENER>): void;
}

export interface StateMachineBaseData<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
> {
    name: string,
    interceptors: SmListenerDefList<SM_IF_LISTENER>
    listeners: SmListenerDefList<SM_ON_LISTENER>
}

export interface StateMachineTreeDef<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
> extends StateMachineBaseData<SM_ON_LISTENER, SM_IF_LISTENER>{
    initialListener?: SmListenerDef<SM_ON_LISTENER>
    stageDefs: StageDef<string, any, any, any> []
    syncDefs: SyncStateMachineDef<SM_IF_LISTENER, any, any> [],
}


export interface StateMachineData<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
> extends StateMachineBaseData<SM_ON_LISTENER, SM_IF_LISTENER>{
    stageDefsByKey: IKeyValuePairs<StageDef<string, any, any, any>>,
    parent?: ParentStateMachineInfo<any, any>,
}
