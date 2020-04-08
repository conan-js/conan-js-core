import {InitializingActions} from "../prototypes/flowStateMachine";
import {StateMachine} from "../stateMachine";
import {State} from "../core/state";
import {ForkStateMachineListener} from "../prototypes/forkStateMachine";
import {StateLogic} from "../reactions/reactorFactory";


export class FlowService implements StateLogic<InitializingActions>{
    constructor(
        private readonly mainSm: StateMachine<any>,
        private readonly mainForkSm: StateMachine<ForkStateMachineListener>
    ) {}

    doDeferredStart (state: State<any>): void{
        this.mainForkSm.requestState({
            name: 'idle'
        });
        this.mainSm.requestState(state);
    }
}
