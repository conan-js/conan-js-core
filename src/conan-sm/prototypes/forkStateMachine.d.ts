import { SmListener } from "../events/stateMachineListeners";
import { State } from "../core/state";
import { IProducer } from "../../conan-utils/typesHelper";
import { StateMachineDefBuilder } from "../core/stateMachineDefBuilder";
import { ForkRequest } from "../services/forkService";
import { StateMachine } from "../stateMachine";
import { Reaction } from "../reactions/reactor";
export interface ForkStateMachineListener extends SmListener {
    onIdle?: Reaction<IdleActions>;
    onForking?: Reaction<ForkingActions, ForkRequest>;
    onWaiting?: Reaction<WaitingActions, StateMachine<any>>;
}
export interface IdleActions {
    startForking(): State<'forking'>;
}
export interface ForkingActions {
    waiting(): State<'waiting'>;
}
export interface WaitingActions {
    joinBack(): State<'idle'>;
}
export declare let ForkStateMachineBuilder$: IProducer<StateMachineDefBuilder<ForkStateMachineListener>>;
