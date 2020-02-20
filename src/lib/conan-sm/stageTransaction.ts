import {StageToProcess, StateMachine, ToProcess} from "./stateMachine";
import {IConsumer} from "../conan-utils/typesHelper";
import {Stage} from "./stage";
import {SmTransition} from "./stateMachineEvents";

export class StateMachineTransactions {
    private _currentTransaction: StageTransaction;
    private _currentRootTransaction: StageTransaction;

    constructor(
        private readonly stateMachine: StateMachine<any, any, any>
    ) {
    }


    createStageTransaction(stageToProcess: StageToProcess, stageProcessor: IConsumer<StageToProcess>, actionsProcessor: IConsumer<SmQueueResult>): StageTransaction {
        let stage = stageToProcess.stage;
        let thisId = `/::${stage.name}`;
        if (this._currentRootTransaction == null) {
            this._currentRootTransaction = new StageTransaction(stage, actionsProcessor, thisId);
            this._currentTransaction = this._currentRootTransaction;
        } else {
            this._currentTransaction = new StageTransaction(stage, actionsProcessor, this._currentTransaction.id + thisId);
        }
        this.stateMachine.logTransactionCreated (this._currentTransaction);
        stageProcessor(stageToProcess);
        return this._currentTransaction;
    }



    retrieveCurrentStageTransaction(): StageTransaction {
        return this._currentTransaction;
    }

    getCurrentTransactionId() {
        if (!this._currentTransaction) return '-';

        return this._currentTransaction._currentTransition ?
            this._currentTransaction.id + '=>' + this._currentTransaction._currentTransition.path :
            this._currentTransaction.id;
    }
}


export class StageTransaction {
    public _currentTransition: SmTransition;
    private _smRequestQueue = new SmRequestQueue();

    constructor(
        private readonly stage: Stage,
        private readonly actionsProcessor: IConsumer<SmQueueResult>,
        public readonly id: string,
        public readonly parent?: StageTransaction
    ) {
    }


    retrieveTransitionQueue(currentTransition: SmTransition): SmRequestQueue {
        this._currentTransition = currentTransition;
        return this._smRequestQueue;
    }

    close() {
        this.actionsProcessor(this._smRequestQueue.result);
    }
}

export interface SmQueueResult {
    wasCancelled: boolean;
    toProcess: ToProcess[];
    cancelled: ToProcess[];
}

export class SmRequestQueue {
    private toProcessQueue: ToProcess[] = [];
    private processing: boolean = false;
    private onCompletedCalled: boolean = false;
    result: SmQueueResult = {
        wasCancelled: false,
        cancelled: [],
        toProcess: [],
    };

    constructor(
    ) {}

    public pushRequest(
        toProcess: ToProcess
    ): void {
        this.toProcessQueue.push(toProcess);
        if (!this.processing) {
            this.processing = true;
            this.processPendingEvents();
        }
    }

    public stop(): void {
        this.result.wasCancelled = true;
    }

    private processPendingEvents(): void {
        if (this.toProcessQueue.length === 0) {
            this.processing = false;
            return;
        }

        let pendingStages: ToProcess[] = [...this.toProcessQueue];
        this.toProcessQueue = [];
        pendingStages.forEach(it => {
            if (this.result.wasCancelled) {
                this.result.cancelled.push(it);
                return;
            }
            this.result.toProcess.push(it);
        });
        this.processPendingEvents();
    }
}
