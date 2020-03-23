import {StateMachineDefBuilder} from "./stateMachineDefBuilder";
import {OnEventCallback, SmListener} from "./stateMachineListeners";
import {State} from "./state";

export interface ForkStateMachineListener extends SmListener{
    onIdle?: OnEventCallback <IdleActions>
    omForking?: OnEventCallback <ForkingActions>
}

export interface ForkData {

}

export interface ForkingActions {

}

export interface IdleActions {
    startForking (forkingData: ForkData): State<'forking', ForkData>
}

export let ForkStateMachineBuilder$: StateMachineDefBuilder<ForkStateMachineListener> = new StateMachineDefBuilder<ForkStateMachineListener>()
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
