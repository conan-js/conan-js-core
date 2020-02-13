import {Stage} from "./stage";
import {SerializedSmEvent, SmEvent} from "./stateMachineEvents";
import {SmController} from "./_domain";

export class EventThread  {
    public currentEvent: SmEvent;
    private readonly events: SmEvent[] = [];

    serialize(): SerializedSmEvent[] {
        return this.events.map(event=> ({
            stageName: event.stageName,
            eventName: event.eventName,
            ...(event.payload ? {payload:event.payload}: undefined),
            ...(event.fork ? {fork:event.fork.getEvents()}: undefined),
        }));
    }

    public addActionEvent(
        actionEventName: string,
        payload: any,
        fork?: SmController<any, any>
    ){
        let thisStage: Stage = {
            name: this.currentEvent.stageName,
            requirements: payload
        };
        this.addStageEvent(
            thisStage,
            actionEventName,
            payload,
            fork
        )
    }

    public addStageEvent(
        stage: Stage,
        eventName: string,
        payload?: any,
        fork?: SmController<any, any>
    ): Stage {

        let currentEvent = {
            stageName: stage.name,
            eventName: eventName,
            payload: payload ? payload : stage.requirements,
            ...fork ? {fork} : undefined
        };
        this.currentEvent = currentEvent;
        this.events.push(currentEvent);
        return stage;
    }
}
