import {State} from "../core/state";
import {StateMachineCore} from "../core/stateMachineCore";
import {
    isStageEvent,
    RawTransitionSmEvent,
    SerializedSmEvent,
    SmTransition,
    TransitionSmEvent
} from "./stateMachineEvents";

export class SmEventThread  {
    public currentTransitionEvent: RawTransitionSmEvent;
    public currentStateEvent: State<any, any>;
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
        fork?: StateMachineCore<any>
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
        stage: State<any, any>
    ): void {
        this.currentStateEvent = stage;
        this.addEvent(stage);
    }

    getCurrentStateName(): string {
        if (this.currentStateEvent == null) return '-';
        return this.currentStateEvent.name;
    }

    private addEvent(event: RawTransitionSmEvent | State) {
        this.events.push(event);
        this.currentEvent = event;
    }

    getCurrentTransitionName() {
        if (this.currentTransitionEvent == null) return '-';
        return this.currentTransitionEvent.transitionName;
    }

    getCurrentState() {
        return this.currentStateEvent;
    }

}
