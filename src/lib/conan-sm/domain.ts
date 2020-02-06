import {IBiConsumer, IConsumer, IFunction, IKeyValuePairs} from "../conan-utils/typesHelper";
import {EventThread} from "./eventThread";
import {Stage} from "./stage";
import {StateMachine} from "./stateMachine";


export interface BaseSmEvent {
    stageName: string,
    eventName: string,
    payload?: any;
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
