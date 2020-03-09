import {Stage} from "./stage";
import {
    ifTransitionTypeIs,
    SerializedSmEvent,
    SmEventType, SmTransition,
    StageSmEvent,
    TransitionSmEvent
} from "./stateMachineEvents";
import {SmController} from "./_domain";
import {Strings} from "../conan-utils/strings";

export class EventThread  {
    public currentActionEvent: TransitionSmEvent;
    public currentStageEvent: StageSmEvent;
    public currentEvent: TransitionSmEvent | StageSmEvent;
    private readonly events: (TransitionSmEvent | StageSmEvent)[] = [];

    serialize(): SerializedSmEvent[] {
        return this.events.map(event=> ({
            stageName: ifTransitionTypeIs (event, event=> event.data.stage, event=> event.data.transition.stage),
            eventName: event.eventName,
            ...(ifTransitionTypeIs (event, event=> undefined, event=> event.data.payload)),
            ...(event.fork ? {fork:event.fork.getEvents()}: undefined),
        }));
    }

    public addActionEvent(
        transitionEvent: SmTransition,
        fork?: SmController<any, any>
    ){
        let event:TransitionSmEvent = {
            eventName: transitionEvent.actionName,
            type: SmEventType.TRANSITION,
            data: transitionEvent,
            fork: fork
        };
        this.currentActionEvent = event;
        this.addEvent(event);
    }

    public addStageEvent(
        stage: Stage,
        eventName: string,
        payload?: any,
        fork?: SmController<any, any>
    ): void {
        let event: StageSmEvent = {
            eventName: Strings.camelCaseWithPrefix('on', stage.stage),
            type: SmEventType.STAGE,
            data: stage,
            fork: fork,
        };
        this.currentStageEvent =event;
        this.addEvent(event);
    }

    getCurrentStageName(): string {
        if (this.currentStageEvent == null) return '-';
        return this.currentStageEvent.data.stage;
    }

    private addEvent(event: TransitionSmEvent | StageSmEvent) {
        this.events.push(event);
        this.currentEvent = event;
    }

    getCurrentActionName() {
        if (this.currentActionEvent == null) return '-';
        return this.currentActionEvent.data.actionName;
    }
}
