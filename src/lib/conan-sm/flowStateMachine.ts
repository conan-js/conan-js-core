import {OnEventCallback, SmListener} from "./stateMachineListeners";
import {State} from "./state";

interface ForkData {
}

export interface ProcessionActionActions {
    fork():State<'forking', ForkData>
}

export interface ForkingActions {
    createForkSm():State<'creatingForkSm'>
}

export interface FlowStateMachineListener extends SmListener{
    onProcessingAction?: OnEventCallback<ProcessionActionActions>;
    onForking?: OnEventCallback<ForkingActions>;
}
