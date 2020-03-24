import {StateMachineDefBuilder} from "./stateMachineDefBuilder";
import {OnEventCallback, SmListener} from "./stateMachineListeners";
import {DeferredInfo, State} from "./state";

export interface ForkStateMachineListener extends SmListener{
    onIdle?: OnEventCallback <IdleActions>
    onForking?: OnEventCallback <ForkingActions>
}

export interface ForkData {

}

export interface ForkingActions {

}

export interface IdleActions {
    startForking (deferInfo: DeferredInfo<any, any>): State<'forking', ForkData>
}

export let ForkStateMachineBuilder$: StateMachineDefBuilder<ForkStateMachineListener> = new StateMachineDefBuilder<ForkStateMachineListener>()
    .withState<
        IdleActions
    >(
        "idle",
        ()=>({
            startForking(forkingData: ForkData): State<"forking", ForkData> {
                return {
                    name: "forking",
                    data: forkingData
                }
            }
        }),
    )
    .withState<
        ForkingActions,
        DeferredInfo<any, any>
        >(
        "forking",
        ()=>({

        }),
    );
