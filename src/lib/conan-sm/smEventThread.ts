import {State} from "./state";
import {
    isStageEvent,
    RawTransitionSmEvent,
    SerializedSmEvent,
    SmTransition,
    TransitionSmEvent
} from "./stateMachineEvents";
import {StateMachine} from "./stateMachine";

export class SmEventThread  {
    public currentTransitionEvent: RawTransitionSmEvent;
    public currentStageEvent: State;
    public currentEvent: RawTransitionSmEvent | State;
    private readonly events: (RawTransitionSmEvent | State)[] = [];

    public serialize(): SerializedSmEvent[] {
        return this.events.map(event=> isStageEvent(event) ?  event : {
            ...event,
            ...event.fork ? {fork: event.fork.getEvents()} : undefined,
        } as TransitionSmEvent);
    }

    public addActionEvent(
        transitionEvent: SmTransition,
        fork?: StateMachine<any, any>
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
        stage: State
    ): void {
        this.currentStageEvent = stage;
        this.addEvent(stage);
    }

    getCurrentStageName(): string {
        if (this.currentStageEvent == null) return '-';
        return this.currentStageEvent.name;
    }

    private addEvent(event: RawTransitionSmEvent | State) {
        this.events.push(event);
        this.currentEvent = event;
    }

    getCurrentTransitionName() {
        if (this.currentTransitionEvent == null) return '-';
        return this.currentTransitionEvent.transitionName;
    }
}
