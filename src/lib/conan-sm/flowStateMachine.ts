import {OnEventCallback, SmListener} from "./stateMachineListeners";
import {State} from "./state";
import {StateMachineDefBuilder} from "./stateMachineDefBuilder";
import {SmTransition} from "./stateMachineEvents";

interface ForkData {
}

export interface ProcessionActionActions {
    fork():State<'forking', ForkData>
}

export interface ForkingActions {
    createForkSm():State<'creatingForkSm'>
}

export interface InitData {
    initialState: State<any>
}

export interface ProcessingActionActions {

}
export interface StateReachedActions {

}

export interface ProcessingStateActions {

}
export interface InitActions {
    doStart (data: InitData):State<'processingStage', State<any>>
}

export interface FlowStateMachineListener extends SmListener{
    onProcessingAction?: OnEventCallback<ProcessionActionActions>;
    onForking?: OnEventCallback<ForkingActions>;
}

export let FlowStateMachineBuilder$: StateMachineDefBuilder<FlowStateMachineListener> = new StateMachineDefBuilder<SmListener>()
    .withDeferredState<
        'init',
        InitActions,
        InitData
    >('init',
        ()=>({
            doStart(data: InitData): State<"processingStage", State<any>> {
                return {
                    data: data.initialState,
                    name: "processingStage"
                }
            }
        }),
        undefined,
        ['processingState']
    )
    .withDeferredState<
        'processingState',
        ProcessingStateActions,
        State<any>
    >(
        "processingState",
        undefined,
        undefined,
        ['stateReached']
    )
    .withState<
        StateReachedActions,
        State<any>
    >(
        "stateReached",
        undefined,
    )
    .withDeferredState<
        'processingAction',
        ProcessingActionActions,
        SmTransition
    >(
        "processingAction",
        undefined,
        undefined,
        ['forkingFlow', 'stateReached']
    );
