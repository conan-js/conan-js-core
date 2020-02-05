import {SerializedSmEvent, SmEvent, TriggerType} from "./domain";
import {IConsumer} from "../conan-utils/typesHelper";
import {Strings} from "../conan-utils/strings";
import {Stage} from "./stage";

export interface EventDispatchParams {
    eventThread: EventThread,
    event: SmEvent,
}


export class EventThread  {
    private readonly events: SmEvent[] = [];
    currentStage: Stage<string, any, any>;
    private currentEvent: SmEvent;
    private closed: boolean = false;
    private currentPath: string;

    constructor(
        readonly name: string,
        private readonly dispatcher: IConsumer<EventDispatchParams>,
        private readonly parent?: EventThread,
    ) {
    }

    actionToStage<
        PAYLOAD,
        STAGE extends Stage<string, any, PAYLOAD>>(
        actionName: string,
        stage: STAGE,
        payload: any = undefined,
        triggerType ?: TriggerType,
    ): STAGE{

        // StateMachineLogger.log(this.name, this.currentStage.name, EventType.ACTION, actionName, `[to stage] => ${stage.name}`);
        let actionStage = {name: this.currentStage.name, ...(payload == null ? undefined : {payload: payload})};
        this.doStage(actionStage, triggerType ? triggerType : TriggerType.ACTION_FROM, Strings.camelCaseWithPrefix('on', actionName), payload);
        if (this.closed) return stage;
        return this.doStage(stage, TriggerType.ACTION_INTO, Strings.camelCaseWithPrefix('on', stage.name)) as any;
    }


    moveToStage<
        PAYLOAD,
        STAGE extends Stage<string, any, PAYLOAD>
    >(
        stage: STAGE,
        overrideTriggerType?: TriggerType
    ): STAGE {
        let triggerType: TriggerType;
        if (overrideTriggerType) {
            triggerType = overrideTriggerType;
        }else{
        triggerType =   this.currentEvent.trigger == TriggerType.START ? TriggerType.START :
                        this.currentEvent.fork == null ? TriggerType.MOVE_TO_STAGE :
                        TriggerType.FORK_JOIN;
        }
        return this.doStage(
            stage,
            triggerType,
            Strings.camelCaseWithPrefix('on', stage.name)
        )
    }

    private notifyEvent(event: SmEvent) {
        let eventWithPath: SmEvent = event;
        if (this.currentPath) {
            eventWithPath = {
                ...event,
                currentPath: this.currentPath
            };
        }


        this.currentEvent = eventWithPath;
        this.events.push(eventWithPath);

        if (!this.parent) {
            this.publish(eventWithPath);
        } else if (this.parent && eventWithPath.trigger === TriggerType.ACTION_FROM){
            this.publish(eventWithPath);
        }
    }

    private publish(event: SmEvent) {
        this.dispatcher({
            event: event,
            eventThread: this
        })
    }

    serialize(): SerializedSmEvent[] {
        return this.events.map(event=> ({
            trigger: event.trigger,
            stageName: event.stageName,
            eventName: event.eventName,
            ...(event.payload != null ? {payload:event.payload}: undefined),
            ...(event.fork != null ? {fork:event.fork.getEvents()}: undefined),
        }));
    }

    public doStage<PAYLOAD, STAGE extends Stage<string, any, PAYLOAD>>(
        stage: STAGE,
        triggerType: TriggerType,
        eventName: string,
        payload?: any,
        isAction:boolean = false,
    ): STAGE {
        if (this.closed) throw new Error('Unexpected error');

        if (!isAction) {
            this.currentStage = stage;
        }

        this.notifyEvent({
            stageName: stage.name,
            trigger: triggerType,
            eventName: eventName,
            payload: payload ? payload : stage.requirements
        });
        return stage;
    }

    switchPaths(pathName: string): void {
        this.currentPath = pathName;
    }
}
