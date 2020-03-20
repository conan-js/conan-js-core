import {EventThread} from "./eventThread";
import {Stage, StageDef} from "./stage";
import {WithMetadataArray} from "../conan-utils/typesHelper";
import {ListenerType, OnEventCallback, SmListener, SmListenerDefLike} from "./stateMachineListeners";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {StateMachineController} from "./_domain";
import {StateMachineDef} from "./stateMachineDef";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {ListenersController} from "./listenersController";
import {StateMachineTree} from "./stateMachineTree";

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
    private readonly eventThread: EventThread = new EventThread();
    private closed: boolean = false;

    private readonly listenersController: ListenersController<SM_ON_LISTENER, ACTIONS>;
    private readonly interceptorsController: ListenersController<SM_IF_LISTENER, ACTIONS>;

    constructor(
        readonly stateMachineDef: StateMachineDef<SM_ON_LISTENER, SM_IF_LISTENER>,
        readonly logger: StateMachineLogger
    ) {
        this.listenersController = new ListenersController(stateMachineDef.listeners, logger);
        this.interceptorsController = new ListenersController(stateMachineDef.interceptors, logger);
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
        return this.getListenerController(type).createReactions(eventName);
    }

    deleteListeners(listenerNames: string[], type: ListenerDefType) {
        this.getListenerController(type).deleteListeners(listenerNames);
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

    forkInto(tree: StateMachineTree<any>): void {
        this.eventThread.currentTransitionEvent.fork = tree.root;
    }

    moveToStage (stage: Stage): void {
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
        return type === ListenerDefType.INTERCEPTOR ? this.interceptorsController : this.listenersController;
    }
}
