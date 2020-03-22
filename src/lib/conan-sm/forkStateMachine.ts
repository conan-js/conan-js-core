import {StateMachineDefBuilder} from "./stateMachineDefBuilder";
import {SmListener} from "./stateMachineListeners";
import {State} from "./state";

export interface ForkStateMachineListener extends SmListener{

}

export interface ForkData {

}

export interface ForkingActions {

}

export interface IdleActions {
    startForking (forkingData: ForkData): State<'forking', ForkData>
}

export let ForkStateMachineBuilder$: StateMachineDefBuilder<ForkStateMachineListener> = new StateMachineDefBuilder<SmListener>()
    .withState<
        IdleActions
    >(
        "idle",
        undefined,
    )
    .withState<
        ForkingActions
        >(
        "forking",
        undefined,
    );
