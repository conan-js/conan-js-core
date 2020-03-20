import {State, StateDef} from "./state";
import {EventType} from "./stateMachineLogger";
import {StateMachineController} from "./stateMachineController";

export class StateMachineOrchestrator {
    constructor(
       private readonly controller: StateMachineController<any, any>
    ) {}

    onResume(): void {
    }

    onSleep(): void {
    }

    onMovingToNonExistingState(thisState: State, nextState: State) {
        throw new Error('TBI');
    }

    onActionTriggered(actionName: string, nextState: State, nextStateDef: StateDef<any, any, any>) {
        this.controller.log(EventType.PROXY, `(${actionName})=>::${nextState.name}`);
        this.controller.requestTransition({
            transitionName: actionName,
            ...nextState ? {payload: nextState.data} : undefined,
            into: nextState,
        });
    }
}
