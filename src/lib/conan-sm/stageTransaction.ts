import {StateMachine, ToProcess, ToProcessType} from "./stateMachine";
import {ICallback, IConsumer} from "../conan-utils/typesHelper";
import {EventType} from "./stateMachineLogger";
import {SmTransition} from "./stateMachineEvents";
import {Stage} from "./stage";

export interface OnCompletedCallbackParams {
    cancelled: boolean,
    processedCb: ToProcess[],
    cancelledCb: ToProcess[],
}

export interface OnNewRequestAddedToTheQueue {
    justAdded: ToProcess,
    queue: ToProcess[]
}

export interface RequestQueueCallbacks {
    onCompleted: IConsumer<OnCompletedCallbackParams>,
    onNewRequestAddedToTheQueue: IConsumer<OnNewRequestAddedToTheQueue>,
    onRequestAboutToBeProcessed: IConsumer<ToProcess>,
    onRequestJustProcessed: IConsumer<ToProcess>,
}

export class SmRequestQueueFactory {

    public static createStageQueue(stateMachine: StateMachine<any, any, any>, stage: Stage): SmRequestQueue {
        return SmRequestQueueFactory.doCreateQueue(stateMachine, stage, () => undefined);
    }

    public static createTransitionQueue(stateMachine: StateMachine<any, any, any>, transition: SmTransition): SmRequestQueue {
        return SmRequestQueueFactory.doCreateQueue(stateMachine, transition, () => {
            stateMachine.requestStage({
                description: `::${transition.into.name}`,
                type: ToProcessType.STAGE,
                stage: transition.into,
                eventType: EventType.STAGE
            })
        });
    }


    private static doCreateQueue(stateMachine: StateMachine<any, any, any>, source: Stage | SmTransition, onCompletedCb: ICallback) {
        return new SmRequestQueue(
            source,
            (toProcess) => {
                if (toProcess.type === ToProcessType.ACTION) {
                    stateMachine.publishAction(toProcess)
                } else if (toProcess.type === ToProcessType.STAGE) {
                    stateMachine.publishStage(toProcess)
                } else {
                    throw new Error('unexpected error');
                }
            },
            {
                onNewRequestAddedToTheQueue: (params) => {
                    stateMachine.logAddedToQueue(params.justAdded.description)
                },
                onRequestAboutToBeProcessed: (params) => {
                    stateMachine.logAboutToProcess(params.description)
                },
                onRequestJustProcessed: (params) => {
                    stateMachine.logJustProcessed(params.description)
                },
                onCompleted: () => onCompletedCb()
            }
        );
    }

}

export class StateMachineTransactions {
    private _currentTransaction: StageTransaction;
    private _currentRootTransaction: StageTransaction;

    constructor(
        private readonly stateMachine: StateMachine<any, any, any>
    ) {
    }


    createStageTransaction(stage: Stage): StageTransaction {
        let stageQueue = SmRequestQueueFactory.createStageQueue(this.stateMachine, stage);
        let thisId = `/::${stage.name}`;
        if (this._currentRootTransaction == null) {
            this._currentRootTransaction = new StageTransaction(stage, this.stateMachine, stageQueue, thisId);
            this._currentTransaction = this._currentRootTransaction;
        } else {
            this._currentTransaction = new StageTransaction(stage, this.stateMachine, stageQueue, this._currentTransaction.id + thisId);
        }
        this.stateMachine.logTransactionCreated (this._currentTransaction);
        return this._currentTransaction;
    }



    retrieveCurrentStageTransaction(): StageTransaction {
        return this._currentTransaction;
    }
}


export class StageTransaction {
    constructor(
        private readonly stage: Stage,
        private readonly stateMachine: StateMachine<any, any, any>,
        public readonly stageQueue: SmRequestQueue,
        public readonly id: string,
        public readonly parent?: StageTransaction
    ) {
    }

    createTransitionQueue(transition: SmTransition): SmRequestQueue {
        this.stateMachine.logTransitionQueueCreated (this, transition);
        return SmRequestQueueFactory.createTransitionQueue(this.stateMachine, transition);
    }
}

export class SmRequestQueue {
    private toProcessQueue: ToProcess[] = [];
    private processing: boolean = false;
    private cancelled: boolean = false;
    private onCompletedCalled: boolean = false;
    private processedCb: ToProcess[] = [];
    private cancelledCb: ToProcess[] = [];

    constructor(
        readonly source: Stage | SmTransition,
        private readonly processor: IConsumer<ToProcess>,
        private readonly callbacks: RequestQueueCallbacks
    ) {
    }

    public pushRequest(
        toProcess: ToProcess
    ): void {
        this.toProcessQueue.push(toProcess);
        this.callbacks.onNewRequestAddedToTheQueue({
            justAdded: toProcess,
            queue: this.toProcessQueue
        });
        if (!this.processing) {
            this.processing = true;
            this.processPendingEvents();
        }
    }

    public stop(): void {
        this.cancelled = true;
    }

    private processPendingEvents(): void {
        if (this.toProcessQueue.length === 0) {
            if (!this.onCompletedCalled) {
                this.onCompletedCalled = true;
                this.callbacks.onCompleted({
                    cancelled: this.cancelled,
                    cancelledCb: this.cancelledCb,
                    processedCb: this.processedCb
                });
            }
            return;
        }

        let pendingStages: ToProcess[] = [...this.toProcessQueue];
        this.toProcessQueue = [];
        pendingStages.forEach(it => {
            if (this.cancelled) {
                this.cancelledCb.push(it);
                return;
            }
            this.callbacks.onRequestAboutToBeProcessed(it);
            this.processor(it);
            this.callbacks.onRequestJustProcessed(it);
            this.processedCb.push(it);
        });
        this.processPendingEvents();
    }
}
