export enum StatusEventType {
    TRANSITION = 'TRANSITION',
    STEP = 'STEP',
    STATUS = 'STATUS',
    PROCESSING_STATUS = 'PROCESSING_STATUS',
    STATE = 'STATE',
    PROCESSING_STATE = 'PROCESSING_STATE',
}

export interface TransitionEvent {
    type: StatusEventType.TRANSITION,
    transitionName: string,
    transitionPayload: any,
    fromStatus: string,
    intoStatus: {
        name: string,
        data: any
    }
}

export interface StepEvent {
    type: StatusEventType.STEP,
    reducerName: string,
    reducerPayload: any,
    newData: any
}

export interface StatusEvent {
    type: StatusEventType.STATUS  | StatusEventType.PROCESSING_STATUS,
    status: {
        name: string,
        data: any
    }
}

export interface EventWithStatusInfo {
    event: EventsLike,
    statusName: string,
}

export interface StateEvent {
    type: StatusEventType.STATE  | StatusEventType.PROCESSING_STATE,
    data: any
}

export type StateDataProducer<STATUSES, STATUS extends keyof STATUSES> = (defaultValue?: STATUSES[STATUS]) => STATUSES[STATUS]
export type LastStatusData<STATUSES> = { [STATUS in keyof STATUSES]?: STATUSES[STATUS] }
export type StatusDataProducer<STATUSES> = <STATUS extends keyof STATUSES> (statusName: STATUS, defaultValue: STATUSES[STATUS])=> STATUSES[STATUS];

export type EventsLike = TransitionEvent | StepEvent | StatusEvent | StateEvent ;

export interface SerializationStatusesOptions<STATUSES> {
    statuses?: (keyof STATUSES)[]
    excludeInit?: boolean,
    excludeStop?: boolean,
}

export interface SerializationOptions<STATUSES> extends SerializationStatusesOptions<STATUSES>{
    eventTypes?: StatusEventType[],
}

export interface StatusEvents<STATUSES, STATUS extends keyof STATUSES> {
    statusName: STATUS
    allEvents: EventWithStatusInfo[],
    lastState: STATUSES[STATUS]
}

