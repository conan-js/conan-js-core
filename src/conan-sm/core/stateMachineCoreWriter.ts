import {SmListener} from "../events/stateMachineListeners";
import {State} from "./state";
import {SmTransition} from "../events/stateMachineEvents";
import {SmEventThread} from "../events/smEventThread";
import {StateMachineCore} from "./stateMachineCore";

export interface StateMachineCoreWrite {
    moveToState(stage: State): void;

    moveToTransition(transition: SmTransition): void;

    getEventThread(): SmEventThread;
}

export class StateMachineCoreWriter<SM_ON_LISTENER extends SmListener,
    > implements StateMachineCoreWrite {
    constructor(
        private readonly core: StateMachineCore<SM_ON_LISTENER>
    ) {
    }

    moveToState(state: State): void {
        this.core.moveToState(state);
    }

    moveToTransition(transition: SmTransition): void {
        this.core.moveToTransition(transition);
    }

    getEventThread(): SmEventThread {
        return this.core.getEventThread();
    }
}
