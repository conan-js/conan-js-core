import {EventThread} from "./eventThread";
import {Stage, StageDef} from "./stage";
import {WithMetadataArray} from "../conan-utils/typesHelper";
import {ListenerType, OnEventCallback, SmListener, SmListenerDefLike, SmListenerDefList} from "./stateMachineListeners";
import {SerializedSmEvent} from "./stateMachineEvents";
import {StateMachineController} from "./_domain";
import {StateMachineDef} from "./stateMachineDef";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {ListenersController} from "./listenersController";

export enum ToProcessType {
    STAGE = 'STAGE'
}

export interface StageToProcess extends BaseToProcess {
    type: ToProcessType.STAGE;
    stage: Stage;
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

export interface ListenerMetadata {
    name: string,
    executionType: ListenerType,
}

export enum ListenerDefType {
    LISTENER = 'LISTENER',
    INTERCEPTOR = 'INTERCEPTOR',
}

export class StateMachine<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS = any,
> implements StateMachineController<SM_ON_LISTENER, SM_IF_LISTENER> {
    _status: StateMachineStatus = StateMachineStatus.IDLE;
    readonly eventThread: EventThread = new EventThread();
    private closed: boolean = false;

    private listenersController: ListenersController<SM_ON_LISTENER, ACTIONS>;
    private interceptorsController: ListenersController<SM_IF_LISTENER, ACTIONS>;

    constructor(
        readonly stateMachineDef: StateMachineDef<SM_ON_LISTENER, SM_IF_LISTENER>,
        readonly logger: StateMachineLogger
    ) {
        this.listenersController = new ListenersController(stateMachineDef.listeners, logger)
        this.interceptorsController = new ListenersController(stateMachineDef.interceptors, logger)
    }

    getStateData(): any {
        return this.eventThread.currentStageEvent.data;
    }


    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.listenersController.addListener(listener, type);
        return this;
    }

    addInterceptor(interceptor: SmListenerDefLike<SM_IF_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.interceptorsController.addListener(interceptor, type);
        return this;
    }

    createReactions(eventName: string, type: ListenerDefType): WithMetadataArray<OnEventCallback<ACTIONS>, ListenerMetadata> {
        return this.getController(type).createReactions(eventName);
    }

    deleteListeners(listenerNames: string[], type: ListenerDefType) {
        this.getController(type).deleteListeners(listenerNames);
    }

    private getController(type: ListenerDefType) {
        return type === ListenerDefType.INTERCEPTOR ? this.interceptorsController : this.listenersController;
    }

    getStageDef(name: string): StageDef<any, any, any> {
        return this.stateMachineDef.stageDefsByKey [name];
    }

    getEvents(): SerializedSmEvent [] {
        return this.eventThread.serialize();
    }

    flagAsRunning(details: string) {
        this.logger.log(EventType.REQUEST,  `+::${details}`);
        this._status = StateMachineStatus.RUNNING;
    }

    sleep() {
        this._status = StateMachineStatus.IDLE;
        this.logger.log(EventType.SLEEP,  ``);
    }

    assertNotClosed() {
        if (this.closed) {
            throw new Error(`can't perform any actions in a SM once the SM is closed`);
        }
    }
}
