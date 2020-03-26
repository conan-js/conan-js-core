import {StateMachine} from "../stateMachine";
import {ForkStateMachineListener} from "../prototypes/forkStateMachine";
import {TransactionTree} from "../../conan-tx/transactionTree";
import {DeferredInfo, ListenerType, State, StateDef} from "../..";
import {BaseSmRequestStrategy, SmRequestStrategy} from "./smRequestStrategy";

export class ForkSmRequestStrategy extends BaseSmRequestStrategy {
    constructor(
        private readonly forkSm: StateMachine<ForkStateMachineListener>,
        private readonly otherwise: SmRequestStrategy,
        private readonly txTree: TransactionTree,
    ) {
        super();
    }


    onTransitionRequest(stateMachine: StateMachine<any>, actionName: string, nextState: State, payload?: any): void {
        let nextStateDef: StateDef<string, any, any, any> = stateMachine.getStateDef(nextState.name);
        if (nextStateDef == null) {
            throw new Error('TBC');
        } else if (nextStateDef.deferredInfo != null) {
            this.forkSm.runNow({
                onIdle: (actions) => {
                    this.forkSm.addListener(['::forking=>doStartFork', {
                        onForking: (forkingData) => this.startFork(actions.getStateData())
                    }], this.txTree, ListenerType.ONCE);
                    actions.startForking(nextStateDef.deferredInfo)
                }
            });

        } else {
            this.otherwise.onTransitionRequest(stateMachine, actionName, nextState, payload);
        }
    }

    private startFork(deferredInfo: DeferredInfo<any>) {
        // StateMachineFactory.create({
        //     rootDef: new StateMachineCoreImpl(new StateMachineDefBuilder().build()),
        //     syncDefs: undefined
        // })
        throw new Error('TBI');
    }
}
