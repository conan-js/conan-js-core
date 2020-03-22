import {ListenerType, OnEventCallback, SmListener, SmListenerDefLike} from "./stateMachineListeners";
import {StateMachine, StateMachineCore} from "./stateMachine";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {EventType} from "./stateMachineLogger";
import {State, StateDef} from "./state";
import {WithMetadataArray} from "../conan-utils/typesHelper";
import {ListenerDefType, ListenerMetadata} from "./stateMachineCore";

export abstract class StateMachineBase<
    SM_ON_LISTENER extends SmListener
> implements StateMachine<SM_ON_LISTENER>{
    protected constructor(
        private stateMachineCore: StateMachineCore<SM_ON_LISTENER>
    ) {
    }

    getStateData(): any {
        return this.stateMachineCore.getStateData();
    }

    getEvents(): SerializedSmEvent[] {
        return this.stateMachineCore.getEvents();
    }

    log (eventType: EventType, details?: string, additionalLines?: [string, string][]): void {
        this.stateMachineCore.log(eventType, details, additionalLines)
    }

    getStateDef(name: string): StateDef<any, any, any> {
        return this.stateMachineCore.getStateDef(name);
    }

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.stateMachineCore.addListener(listener, type);
        return this;
    }

    createReactions(eventName: string, type: ListenerDefType): WithMetadataArray<OnEventCallback<any>, ListenerMetadata> {
        return this.stateMachineCore.createReactions(eventName, type);
    }

    deleteListeners(listenerNames: string[], type: ListenerDefType): void {
        this.stateMachineCore.deleteListeners(listenerNames, type);
    }

    getCurrentStageName(): string {
        return this.stateMachineCore.getCurrentStageName();
    }

    getCurrentTransitionName(): string {
        return this.stateMachineCore.getCurrentTransitionName();
    }

    abstract requestStage(state: State<string, void>): void;

    abstract requestTransition(transition: SmTransition): this;

    abstract runNow(toRun: [string, SM_ON_LISTENER] | SM_ON_LISTENER): void;


}
