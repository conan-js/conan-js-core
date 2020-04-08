import { InitializingActions } from "../prototypes/flowStateMachine";
import { StateMachine } from "../stateMachine";
import { State } from "../core/state";
import { ForkStateMachineListener } from "../prototypes/forkStateMachine";
import { StateLogic } from "../reactions/reactorFactory";
export declare class FlowService implements StateLogic<InitializingActions> {
    private readonly mainSm;
    private readonly mainForkSm;
    constructor(mainSm: StateMachine<any>, mainForkSm: StateMachine<ForkStateMachineListener>);
    doDeferredStart(state: State<any>): void;
}
