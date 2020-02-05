import {IBiConsumer, IConsumer, IFunction, IKeyValuePairs} from "../conan-utils/typesHelper";
import {EventThread} from "./eventThread";
import {Stage} from "./stage";
import {StateMachine} from "./stateMachine";

export enum TriggerType {
    FORK_START = 'FORK_START',
    FORK_JOIN = 'FORK_JOIN',
    MOVE_TO_STAGE = 'MOVE_TO_STAGE',
    ACTION_FROM = 'ACTION_FROM',
    ACTION_INTO = 'ACTION_INTO',
    START = 'START',
    STOP = 'STOP',
}

export interface BaseSmEvent {
    eventName: string,
    trigger: TriggerType,
    stageName: string,
    payload?: any;
    currentPath?: string;
}

export interface SmEvent extends BaseSmEvent{
    fork?: StateMachine<any, any>,
}

export interface SerializedSmEvent extends BaseSmEvent{
    fork?: SerializedSmEvent[];
}


export interface StageEntryPoint<STAGE, REQUIREMENTS = void> {
    name: string;
    create: IFunction<REQUIREMENTS, STAGE>;
}

export interface ThenParams<NEXT_STAGE, OUTPUT> {
    notAuthenticatedStage: NEXT_STAGE;
    payload: OUTPUT;
}

export interface ActionListener<THIS_ACTIONS, THIS_STAGE extends Stage<string, THIS_ACTIONS, any>, PAYLOAD = void> {
    then?: IBiConsumer<ThenParams<THIS_STAGE, PAYLOAD>, SmEvent>;
    thenRequest?: IBiConsumer<THIS_ACTIONS, SmEvent>;
    withPayload?: IBiConsumer<PAYLOAD, SmEvent>;
}

export interface EventListener<THIS_ACTIONS, THIS_STAGE extends Stage<string, THIS_ACTIONS, REQUIREMENTS>, REQUIREMENTS = void> extends ActionListener<THIS_ACTIONS, THIS_STAGE, REQUIREMENTS>{}

export type SmListener <
    ACTIONS = any,
    STAGE extends Stage<string, ACTIONS, REQUIREMENTS>  = any,
    REQUIREMENTS = any
>= IKeyValuePairs<EventListener<ACTIONS, STAGE, REQUIREMENTS>>;
