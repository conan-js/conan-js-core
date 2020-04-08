import { BaseActions, SmListener } from "../events/stateMachineListeners";
import { State } from "../core/state";
import { StateMachineDefBuilder } from "../core/stateMachineDefBuilder";
import { IFunction } from "../../conan-utils/typesHelper";
import { StateMachine } from "../stateMachine";
import { ForkStateMachineListener } from "./forkStateMachine";
import { Reaction } from "../reactions/reactor";
import { Asap } from "../../conan-utils/asap";
export interface SetupActions {
    doInit(stateMachine: StateMachine<any>): State<'init', StateMachine<any>>;
}
export interface InitializingActions {
    doDeferredStart(state: State<any>): State<"running">;
}
export interface InitActions {
    doStart(initialState: Asap<State<any>>): State<"running"> | State<"initializing">;
}
export interface FlowStateMachineListener extends SmListener {
    onInit?: Reaction<InitActions>;
    onSetup?: Reaction<SetupActions>;
    onRunning?: Reaction<BaseActions<State<any, any>>>;
}
export interface FlowStateMachineBuilderParams {
    mainSm: StateMachine<any>;
    thisForkSm: StateMachine<ForkStateMachineListener>;
    mainForkSm: StateMachine<ForkStateMachineListener>;
}
export declare let FlowStateMachineBuilder$: IFunction<FlowStateMachineBuilderParams, StateMachineDefBuilder<FlowStateMachineListener>>;
