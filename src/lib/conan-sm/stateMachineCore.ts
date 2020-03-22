import {State, StateDef} from "./state";
import {WithMetadataArray} from "../conan-utils/typesHelper";
import {ListenerType, OnEventCallback, SmListener, SmListenerDefLike} from "./stateMachineListeners";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {StateMachineCoreDef} from "./stateMachineCoreDef";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {ListenersController} from "./listenersController";
import {SmEventThread} from "./smEventThread";
import {StateMachineEndpoint} from "./stateMachine";

export enum ToProcessType {
    STAGE = 'STAGE'
}

export interface StageToProcess extends BaseToProcess {
    type: ToProcessType.STAGE;
    stage: State;
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

export class StateMachineCoreImpl<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS = any,
>  implements StateMachineEndpoint{
    private readonly eventThread: SmEventThread = new SmEventThread();
    private readonly listenersController: ListenersController<SM_ON_LISTENER, ACTIONS>;
    private readonly interceptorsController: ListenersController<SM_IF_LISTENER, ACTIONS>;

    constructor(
        readonly stateMachineDef: StateMachineCoreDef<SM_ON_LISTENER, SM_IF_LISTENER>,
        readonly logger: StateMachineLogger
    ) {
        this.listenersController = new ListenersController(stateMachineDef.listeners, logger);
        this.interceptorsController = new ListenersController(stateMachineDef.interceptors, logger);
    }

    getStateData(): any {
        return this.eventThread.currentStageEvent.data;
    }

    getStateName (): string{
        return this.eventThread.currentStageEvent.name;
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

    getStateDef(name: string): StateDef<any, any, any> {
        return this.stateMachineDef.stageDefsByKey [name];
    }

    getEvents(): SerializedSmEvent [] {
        return this.eventThread.serialize();
    }

    moveToState (stage: State): void {
        this.eventThread.addStageEvent(stage);
        this.logger.log(EventType.STAGE,  `::${stage.name}`, [
            [`current state`, stage.data == null ? undefined : JSON.stringify(stage.data)]
        ]);
    }

    moveToTransition (transition: SmTransition): void {
        this.eventThread.addActionEvent(transition);
        this.logger.log(EventType.ACTION, `=>${transition.transitionName}`, [
            [`payload`, transition.payload == null ? undefined : JSON.stringify(transition.payload)]
        ]);
    }

    getCurrentStageName (): string {
        return this.eventThread.getCurrentStageName();
    }

    getCurrentTransitionName (): string {
        return this.eventThread.getCurrentTransitionName();
    }

    log (eventType: EventType, details?: string, additionalLines?: [string, string][]): void {
        this.logger.log(eventType, details, additionalLines);
    }

    private getListenerController(type: ListenerDefType) {
        return type === ListenerDefType.INTERCEPTOR ? this.interceptorsController : this.listenersController;
    }
}
