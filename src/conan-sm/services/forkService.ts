import {StateMachine} from "../stateMachine";
import {ForkStateMachineListener} from "../prototypes/forkStateMachine";
import {State} from "../core/state";
import {SmOrchestrator} from "../wiring/smOrchestrator";
import {StateMachineController} from "../stateMachineController";
import {EventType} from "../logging/stateMachineLogger";
import {ReactionType} from "../reactions/reactor";

export interface ForkRequest {
    mainSm: StateMachine<any>,
    forkSm: StateMachine<ForkStateMachineListener>,
    stateToFork: State<any>,
}
export class ForkService {
   public orchestrator: SmOrchestrator;

    startFork(forkSm: StateMachine<ForkStateMachineListener>, stateMachineController: StateMachineController<any>, state: State<any>) {
        let stateNameToFork = state.name;
        forkSm.runNow(['!::idle=>startForking',{
            onIdle: (next) => {
                forkSm.addListener(['::forking=>waitOn', {
                    onForking: (next) => {
                        forkSm.log(EventType.FORK, `ForkService.statFork (${stateMachineController.getName()}, '${stateNameToFork}')`);
                        next.paths.waiting();
                    }
                }], ReactionType.ONCE);

                next.paths.startForking();
            }
        }])
    }
}
