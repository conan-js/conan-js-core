import { StateMachine } from "../stateMachine";
import { ForkStateMachineListener } from "../prototypes/forkStateMachine";
import { State } from "../core/state";
import { SmOrchestrator } from "../wiring/smOrchestrator";
import { StateMachineController } from "../stateMachineController";
export interface ForkRequest {
    mainSm: StateMachine<any>;
    forkSm: StateMachine<ForkStateMachineListener>;
    stateToFork: State<any>;
}
export declare class ForkService {
    orchestrator: SmOrchestrator;
    startFork(forkSm: StateMachine<ForkStateMachineListener>, stateMachineController: StateMachineController<any>, state: State<any, any>): void;
}
