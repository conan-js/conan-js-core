import {OnEventCallback, SmListener} from "../core/stateMachineListeners";
import {DeferredInfo, State} from "../core/state";
import {IProducer} from "../../conan-utils/typesHelper";
import {StateMachineCoreDefBuilder} from "../core/stateMachineCoreDefBuilder";

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

export let ForkStateMachineBuilder$: IProducer<StateMachineCoreDefBuilder<ForkStateMachineListener>> = ()=>new StateMachineCoreDefBuilder<ForkStateMachineListener>()
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
