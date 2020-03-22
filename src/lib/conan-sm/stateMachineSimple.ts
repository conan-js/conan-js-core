import {SmListener, SmListenerDefLike} from "./stateMachineListeners";
import {State} from "./state";
import {IConsumer, IFunction} from "../conan-utils/typesHelper";
import {SmTransition} from "./stateMachineEvents";
import {TransactionRequest} from "../conan-tx/transaction";
import {StateMachineLogger} from "./stateMachineLogger";
import {StateMachineTx} from "./stateMachineTx";
import {SmOrchestrator} from "./smOrchestrator";
import {StateMachine, StateMachineCore} from "./stateMachine";
import {StateMachineBase} from "./stateMachineBase";

export class StateMachineSimple<
    SM_ON_LISTENER extends SmListener,
> extends StateMachineBase<SM_ON_LISTENER>{
    private txFactory: StateMachineTx;

    constructor(
        stateMachineCore: StateMachineCore<SM_ON_LISTENER>,
        private txConsumer: IConsumer<TransactionRequest>,
        private txInitializer: IFunction<StateMachine<any>, SmOrchestrator>,
        private logger: StateMachineLogger
    ) {
        super(stateMachineCore);
        this.txFactory = new StateMachineTx(
            txInitializer(this),
            logger
        );
    }

    requestStage(state: State): void {
        this.txConsumer(this.txFactory.createStageTxRequest(state));
    }

    requestTransition(transition: SmTransition): this {
        this.txConsumer(this.txFactory.createActionTxRequest(transition));
        return this;
    }


    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void {
        throw new Error('TBI')

    }
}
