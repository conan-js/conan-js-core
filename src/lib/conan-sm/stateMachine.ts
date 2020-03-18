import {EventThread} from "./eventThread";
import {Stage, StageDef} from "./stage";
import {WithMetadataArray} from "../conan-utils/typesHelper";
import {
    ListenerType,
    OnEventCallback,
    SmListener,
    SmListenerDefLike,
    SmListenerDefLikeParser,
    SmListenerDefList
} from "./stateMachineListeners";
import {SerializedSmEvent} from "./stateMachineEvents";
import {StateMachineController} from "./_domain";
import {StateMachineDef} from "./stateMachineDef";
import {EventType, StateMachineLogger} from "./stateMachineLogger";

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

export class StateMachine<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS,
> implements StateMachineController<SM_ON_LISTENER, SM_IF_LISTENER> {
    readonly eventThread: EventThread = new EventThread();
    _status: StateMachineStatus = StateMachineStatus.IDLE;
    private closed: boolean = false;
    private readonly smListenerDefLikeParser: SmListenerDefLikeParser = new SmListenerDefLikeParser();

    constructor(
        readonly stateMachineDef: StateMachineDef<SM_ON_LISTENER, SM_IF_LISTENER>,
        readonly logger: StateMachineLogger
    ) {
    }

    getStateData(): any {
        return this.eventThread.currentStageEvent.data;
    }


    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.assertNotClosed();
        let listenerDef = this.smListenerDefLikeParser.parse(listener, type);
        this.logger.log(EventType.ADD_LISTENER,  `(${listenerDef.metadata})[${type}]`);
        this.stateMachineDef.listeners.push(listenerDef);
        return this;
    }

    addInterceptor(interceptor: SmListenerDefLike<SM_IF_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        let listenerDef = this.smListenerDefLikeParser.parse(interceptor, type);
        this.logger.log(EventType.ADD_INTERCEPTOR,  `(${listenerDef.metadata})`);
        this.stateMachineDef.interceptors.push(
            this.smListenerDefLikeParser.parse(interceptor, type)
        );
        return this;
    }

    createReactions(eventName: string, smListeners: SmListenerDefList<any>): WithMetadataArray<OnEventCallback<ACTIONS>, ListenerMetadata> {
        if (smListeners == null || smListeners.length === 0) return [];

        let reactions: WithMetadataArray<OnEventCallback<ACTIONS>, ListenerMetadata> = [];
        smListeners.forEach(smListener => {
            let actionListener: OnEventCallback<ACTIONS> = smListener.value[eventName];
            if (!actionListener) return undefined;

            reactions.push({
                value: (actions, params) => {
                    this.logger.log(EventType.REACTION,  `(${smListener.metadata})`);
                    actionListener(actions, params)
                },
                metadata: smListener.metadata
            });
        });

        return reactions;

    }

    getStageDef(name: string): StageDef<any, any, any> {
        return this.stateMachineDef.stageDefsByKey [name];
    }

    getEvents(): SerializedSmEvent [] {
        return this.eventThread.serialize();
    }
    deleteListeners(listenerNames: string[]) {
        if (listenerNames.length === 0) return;

        let newListeners: SmListenerDefList<SM_ON_LISTENER> = [];
        this.stateMachineDef.listeners.forEach(currentListener=>{
            if (listenerNames.indexOf(currentListener.metadata.name) > -1) {
                this.logger.log(EventType.DELETE_LISTENER,  `-(${currentListener.metadata.name})[${currentListener.metadata.executionType}]`);
            } else {
                newListeners.push(currentListener)
            }
        });
        this.stateMachineDef.listeners = newListeners;
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
