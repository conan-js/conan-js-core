import {SmListener, SmListenerDefLike} from "./stateMachineListeners";
import {State} from "./state";
import {IConsumer, IFunction} from "../conan-utils/typesHelper";
import {SmTransition} from "./stateMachineEvents";
import {TransactionRequest} from "../conan-tx/transaction";
import {SmOrchestrator} from "./smOrchestrator";
import {StateMachine, StateMachineCore} from "./stateMachine";
import {StateMachineBase} from "./stateMachineBase";
import {StateMachineTx} from "./stateMachineTx";

export class StateMachineSimple<
    SM_ON_LISTENER extends SmListener,
> extends StateMachineBase<SM_ON_LISTENER>{
    private readonly orchestrator: SmOrchestrator;

    constructor(
        stateMachineCore: StateMachineCore<SM_ON_LISTENER>,
        private txConsumer: IConsumer<TransactionRequest>,
        private Orchestrator$: IFunction<StateMachine<any>, SmOrchestrator>,
        private txFactory: StateMachineTx
    ) {
        super(stateMachineCore);
        this.orchestrator = Orchestrator$(this);
    }

    requestStage(state: State): void {
        this.txConsumer(this.txFactory.createStageTxRequest(state, this.orchestrator));
    }

    requestTransition(transition: SmTransition): this {
        this.txConsumer(this.txFactory.createActionTxRequest(transition, this.orchestrator));
        return this;
    }


    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void {
        throw new Error('TBI')

    }
}
