import {Stage} from "./stage";
import {
    isStageEvent,
    RawTransitionSmEvent,
    SerializedSmEvent,
    SmTransition,
    StageSmEvent,
    TransitionSmEvent
} from "./stateMachineEvents";
import {SmController} from "./_domain";

export class EventThread  {
    public currentTransitionEvent: RawTransitionSmEvent;
    public currentStageEvent: StageSmEvent;
    public currentEvent: RawTransitionSmEvent | StageSmEvent;
    private readonly events: (RawTransitionSmEvent | StageSmEvent)[] = [];

    serialize(): SerializedSmEvent[] {
        return this.events.map(event=> isStageEvent(event) ?  event : {
            ...event,
            ...event.fork ? {fork: event.fork.getEvents()} : undefined,
        } as TransitionSmEvent);
    }

    public addActionEvent(
        transitionEvent: SmTransition,
        fork?: SmController<any, any>
    ){
        let event:RawTransitionSmEvent = {
            transitionName: transitionEvent.transitionName,
            ...transitionEvent.payload ? {payload: transitionEvent.payload} : undefined,
            ...fork ? {payload: transitionEvent.payload} : undefined,
        };
        this.currentTransitionEvent = event;
        this.addEvent(event);
    }

    public addStageEvent(
        stage: Stage
    ): void {
        let event: StageSmEvent = {
            ...stage
        };
        this.currentStageEvent =event;
        this.addEvent(event);
    }

    getCurrentStageName(): string {
        if (this.currentStageEvent == null) return '-';
        return this.currentStageEvent.stateName;
    }

    private addEvent(event: RawTransitionSmEvent | StageSmEvent) {
        this.events.push(event);
        this.currentEvent = event;
    }

    getCurrentTransitionName() {
        if (this.currentTransitionEvent == null) return '-';
        return this.currentTransitionEvent.transitionName;
    }
}
