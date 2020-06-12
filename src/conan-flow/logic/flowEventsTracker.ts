import {Status, StatusLikeParser} from "../domain/status";
import {Transition} from "../domain/transitions";
import {StatusRequest} from "./flowRequest";
import {
    EventsLike,
    EventWithStatusInfo,
    LastStatusData,
    SerializationOptions,
    SerializationStatusesOptions,
    StateEvent,
    StatusEvent,
    StatusEvents,
    StatusEventType,
    StepEvent,
    TransitionEvent
} from "../domain/flowEvents";

export class FlowEventsTracker<
    STATUSES,
> {
    private eventsByStatus: { [STATUS in keyof STATUSES]?: StatusEvents<STATUSES, STATUS> } = {} as any;
    private events: EventWithStatusInfo [] = [];
    private lastEvent: EventsLike;
    public currentStatus: Status;

    addTransition(transition: Transition, isStep: boolean) {
        let lastEvent: EventsLike;
        let intoStatus: Status = StatusLikeParser.parse(transition.into);
        if (!isStep) {
            lastEvent = {
                type: StatusEventType.TRANSITION,
                fromStatus: this.currentStatus.name,
                intoStatus: intoStatus,
                transitionName: transition.transitionName,
                transitionPayload: transition.payload
            } as TransitionEvent;
        } else {
            lastEvent = {
                type: StatusEventType.STEP,
                reducerName: transition.transitionName,
                newData: intoStatus.data,
                reducerPayload: transition.payload
            } as StepEvent;
        }
        this.lastEvent = lastEvent;
        this.process(lastEvent);
    }

    addStateFromStatus(stateEvent: StateEvent) {
        this.lastEvent = stateEvent;
        this.process(stateEvent);
    }

    addProcessingStatus(statusRequest: StatusRequest, isStep: boolean) {
        let lastEvent: EventsLike;
        if (!isStep) {
            lastEvent = {
                type: StatusEventType.PROCESSING_STATUS,
                status: statusRequest.status
            } as StatusEvent;
        } else {
            lastEvent = {
                type: StatusEventType.PROCESSING_STATE,
                data: statusRequest.status.data
            } as StateEvent;
        }
        this.currentStatus = statusRequest.status;
        this.lastEvent = lastEvent;
        this.process(lastEvent);
    }

    settleProcessingStatus(statusRequest: StatusRequest, isStep: boolean) {
        if (!isStep) {
            if ((this.lastEvent as StatusEvent).status !== statusRequest.status) {
                throw new Error(`unexpected error settling events`)
            }
            this.lastEvent.type = StatusEventType.STATUS;
            this.addStateFromStatus({
                data: statusRequest.status.data,
                type: StatusEventType.STATE
            })

        } else {
            if ((this.lastEvent as StateEvent).data !== statusRequest.status.data) {
                throw new Error(`unexpected error settling events`)
            }
            this.lastEvent.type = StatusEventType.STATE;
            this.eventsByStatus[this.currentStatus.name].lastState = statusRequest.status.data;
        }
    }

    private process(lastEvent: EventsLike) {
        if (this.eventsByStatus[this.currentStatus.name] == null) {
            this.eventsByStatus[this.currentStatus.name] = {
                allEvents: [],
                statusName: this.currentStatus.name,
                lastState: undefined
            } as StatusEvents<STATUSES, any>;
        }
        let eventWithStatusInfo = {
            event: lastEvent,
            statusName: this.currentStatus.name
        };
        this.eventsByStatus[this.currentStatus.name].allEvents.push(eventWithStatusInfo);
        if (lastEvent.type === StatusEventType.STATE || lastEvent.type === StatusEventType.PROCESSING_STATE) {
            this.eventsByStatus[this.currentStatus.name].lastState = lastEvent.data;
        }
        this.events.push(eventWithStatusInfo);

    }

    serializeStatesWithStatus(filterOptions?: SerializationStatusesOptions<STATUSES>): EventWithStatusInfo [] {
        return this.serializeWithStatusInfo({
            ...filterOptions,
            eventTypes: [StatusEventType.STATE]
        })
    }

    serializeStates(filterOptions?: SerializationStatusesOptions<STATUSES>): StateEvent [] {
        return this.serializeWithStatusInfo({
            ...filterOptions,
            eventTypes: [StatusEventType.STATE]
        }).map(it => it.event) as StateEvent [];

    }

    serializeStatuses(filterOptions?: SerializationStatusesOptions<STATUSES>): StatusEvent [] {
        return this.serializeWithStatusInfo({
            ...filterOptions,
            eventTypes: [StatusEventType.STATUS]
        }).map(it => it.event) as StatusEvent [];
    }

    serialize(filterOptions?: SerializationOptions<STATUSES>): EventsLike[] {
        return this.serializeWithStatusInfo(filterOptions).map(it => it.event);
    }

    serializeWithStatusInfo(filterOptions?: SerializationOptions<STATUSES>): EventWithStatusInfo[] {
        if (!filterOptions) {
            return this.events;
        }
        let filtered: EventWithStatusInfo [] = [];
        this.events.forEach(eventWithStatusInfo => {
            let toBeIncluded: boolean = true;

            if (!toBeIncluded) return;
            if (filterOptions.excludeInit) {
                if (this.eventsByStatus['$init'].allEvents.indexOf(eventWithStatusInfo) > -1) {
                    toBeIncluded = false;
                }
            }

            if (!toBeIncluded) return;
            if (filterOptions.excludeStop) {
                if (this.eventsByStatus['$stop'] && this.eventsByStatus['$stop'].allEvents.indexOf(eventWithStatusInfo) > -1) {
                    toBeIncluded = false;
                }
            }

            if (!toBeIncluded) return;
            if (filterOptions.statuses) {
                filterOptions.statuses.forEach(status => {
                    if (toBeIncluded) return;
                    if (this.eventsByStatus[status as any].allEvents.indexOf(eventWithStatusInfo) === -1) {
                        toBeIncluded = false;
                    }
                })
            }

            if (!toBeIncluded) return;
            if (filterOptions.eventTypes) {
                if (filterOptions.eventTypes.indexOf(eventWithStatusInfo.event.type) === -1) {
                    toBeIncluded = false;
                }
            }

            if (toBeIncluded) {
                filtered.push(eventWithStatusInfo);
            }
        })

        return filtered;
    }

    getLastStates(): LastStatusData<STATUSES> {
        let lastStates: { [STATUS in keyof STATUSES]?: STATUSES[STATUS] } = {};
        Object.keys(this.eventsByStatus).forEach(statusKey => {
            lastStates[statusKey] = this.eventsByStatus[statusKey].lastState;
        })

        return lastStates;
    }

    getLastState<STATUS extends keyof STATUSES>(statusName: STATUS): STATUSES[STATUS] {
        let eventsByStatus = this.eventsByStatus [statusName];
        if (eventsByStatus == null) return undefined;

        return eventsByStatus.lastState;
    }
}
