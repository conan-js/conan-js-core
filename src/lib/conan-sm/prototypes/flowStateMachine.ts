import {OnEventCallback, SmListener} from "../core/stateMachineListeners";
import {State} from "../core/state";
import {SmTransition} from "../stateMachineEvents";
import {StateMachineCoreDefBuilder} from "../core/stateMachineCoreDefBuilder";

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

export let FlowStateMachineBuilder$: StateMachineCoreDefBuilder<FlowStateMachineListener> = new StateMachineCoreDefBuilder<SmListener>()
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
