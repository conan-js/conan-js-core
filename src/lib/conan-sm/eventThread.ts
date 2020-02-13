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
    public currentStageEvent: StageSmEvent;
    public currentEvent: TransitionSmEvent | StageSmEvent;
    private readonly events: (TransitionSmEvent | StageSmEvent)[] = [];

    serialize(): SerializedSmEvent[] {
        return this.events.map(event=> ({
            stageName: ifTransitionTypeIs (event, event=> event.data.name, event=> event.data.into.name),
            eventName: event.eventName,
            ...(ifTransitionTypeIs (event, event=> undefined, event=> event.data.payload)),
            ...(event.fork ? {fork:event.fork.getEvents()}: undefined),
        }));
    }

    public addActionEvent(
        transitionEvent: SmTransition,
        fork?: SmController<any, any>
    ){
        this.addEvent({
            eventName: transitionEvent.path,
            type: SmEventType.TRANSITION,
            data: transitionEvent,
            fork: fork
        });
    }

    public addStageEvent(
        stage: Stage,
        eventName: string,
        payload?: any,
        fork?: SmController<any, any>
    ): void {
        let event: StageSmEvent = {
            eventName: Strings.camelCaseWithPrefix('on', stage.name),
            type: SmEventType.STAGE,
            data: stage,
            fork: fork,
        };
        this.addEvent(event);
        this.currentStageEvent =event;
    }

    getCurrentStageName() {
        if (this.currentStageEvent == null) return '-';
        return this.currentStageEvent.data.name;
    }

    private addEvent(event: TransitionSmEvent | StageSmEvent) {
        this.events.push(event);
        this.currentEvent = event;
    }
}
