import {StageToProcess, StateMachine} from "./stateMachine";
import {ICallback, IProducer, WithMetadata, WithMetadataArray} from "../conan-utils/typesHelper";
import {SmTransition} from "./stateMachineEvents";
import {SmEventCallback} from "./stateMachineListeners";
import {Strings} from "../conan-utils/strings";

export interface ChainRequest {
    chainRequest: SmTransactionRequest;
    chainId: string;
}

export interface SmTransactionRequest {
    name: string;
    stateMachine: StateMachine<any, any, any>;
    target: StageToProcess | SmTransition;
    actions: any;
    onStart?: WithMetadata<ICallback, string>;
    reactionsProducer: IProducer<WithMetadataArray<SmEventCallback<any>, string>>;
    onDone?: WithMetadata<IProducer<ChainRequest | void>, string>;
}

export class StateMachineTransactions {
    private _currentRootTransaction: SmTransaction;

    createStageTransaction(
        request: SmTransactionRequest
    ): SmTransaction {
        if (! this.getCurrentExecution()) {
            this._currentRootTransaction = new SmTransaction(request);
        } else {
            this.getCurrentExecution().fork (request);
        }

        return this.getCurrentExecution();
    }


    runTransitionTransaction(request: SmTransactionRequest): void {
        let smTransaction: SmTransaction;
        if (this.isStopped()) {
            smTransaction = new SmTransaction(request);
            smTransaction.run();
        } else {
            this.getCurrentExecution().fork(request);
        }
    }

    getCurrentTransactionId() {
        if (!this.getCurrentExecution()) return '-';
        return this.getCurrentExecution().getId() ;
    }
    private isStopped() {
        return this._currentRootTransaction == null || this.getCurrentExecution() == null;
    }

    private getCurrentExecution (): SmTransaction {
        return this._currentRootTransaction == null ? null: this._currentRootTransaction.getCurrentRunningTransaction ()
    }
}

export enum SmTransactionStatus {
    CHAINING ='CHAINING',
    IDLE = 'IDLE',
    STARTING = 'STARTING',
    RUNNING = 'RUNNING',
    POST_RUNNING = 'POST_RUNNING',
    CLOSING = 'CLOSING',
    CLOSED = 'CLOSED',
}

export class SmTransactionError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class SmTransaction {
    private _status = SmTransactionStatus.IDLE;
    private _forkedTransitions: SmTransaction[] = [];
    private _chainedTransition: SmTransaction;
    private _delegatedTransition: SmTransaction = undefined;

    constructor(
        private readonly request: SmTransactionRequest,
        public readonly parent?: SmTransaction
    ) {
    }

    getId (): string{
        let current: SmTransaction = this;
        let all: SmTransaction[] = [];
        while (current){
            all.push(current);
            current = current.parent;
        }
        return all.reverse().map(it=>it.getThisName()).join('');
    }

    getThisName (): string{
        return '/' + this.request.name;
    }

    close (): void{
        this.assertNotClosed();
        this._status = SmTransactionStatus.CLOSED;
        this._delegatedTransition = null;
    }

    fork(forkRequest: SmTransactionRequest) {
        this.assertAcceptingFork(forkRequest.name);

        let smTransaction = new SmTransaction(forkRequest, this);
        this._forkedTransitions.push(smTransaction);
        return smTransaction;
    }

    run() {
        if (this.parent) {
            throw new Error(`can't only start a root transaction`)
        }

        this.doRun();
    }

    public getCurrentRunningTransaction(): SmTransaction {
        if (this._status === SmTransactionStatus.CLOSED) return null;

        let current: SmTransaction = this;
        let next: SmTransaction = this._delegatedTransition;
        while (next) {
            current = next;
            next = next._delegatedTransition;
        }
        return current;
    }

    private doRun() {
        let processedReactions: WithMetadataArray<SmEventCallback<any>, string> = [];
        let currentReaction:WithMetadata<SmEventCallback<any>, string> = null;
        try {
            this.assertIdle();

            if (this.request.onStart) {
                this._status = SmTransactionStatus.STARTING;
                this.request.onStart.value();
            }
            this._status = SmTransactionStatus.RUNNING;

            let reactions = this.request.reactionsProducer();
            reactions.forEach(reaction => {
                currentReaction = reaction;
                reaction.value(this.request.actions, {sm: this.request.stateMachine});
                processedReactions.push(reaction);
            });
            currentReaction = undefined;


            let chainRequest = undefined;
            if (this.request.onDone) {
                this._status = SmTransactionStatus.POST_RUNNING;
                chainRequest = this.request.onDone.value();
            }


            this._status = SmTransactionStatus.CLOSING;


            this._forkedTransitions.forEach(it=> {
                this._delegatedTransition = it;
                it.doRun();
            });


            this._status = SmTransactionStatus.CHAINING;

            if (chainRequest) {
                this.doChain (chainRequest.chainRequest)
            }

            this.close();
        } catch (e) {
            if (e instanceof SmTransactionError) throw e;


            let pointer: SmTransaction = this;
            console.error('Error processing transaction');
            console.error(e.message);
            console.error('--------');
            while (pointer){
                console.error(`${Strings.padEnd(pointer._status, 12)} ${pointer.request.name}`);

                if (pointer._status === SmTransactionStatus.POST_RUNNING) {
                    console.error(`         ERROR ON THE POST RUNNING (onDone - ${pointer.request.onDone.metadata})`);
                }
                if (pointer._status === SmTransactionStatus.CLOSING) {
                    console.error(`         ERROR PROCESSING CHILD FORKED TRANSACTIONS`);
                }
                if (currentReaction && this === pointer) {
                    console.error(`         CURRENT REACTION KO: ${currentReaction.metadata}`);
                }

                console.error(`         REACTIONS PROCESSED OK [${processedReactions.length}] ${processedReactions.map(it=>it.metadata).join(',')}`);

                pointer = pointer.parent;
            }
            console.error('--------');

            console.error('ORIGINAL STACK TRACE');
            console.error( e.stack );

            throw new SmTransactionError(e.message);
        }
    }

    private doChain(nextRequest: SmTransactionRequest) {
        let smTransaction = new SmTransaction(nextRequest, this);
        this._chainedTransition = smTransaction;
        this._delegatedTransition = this._chainedTransition;
        smTransaction.doRun();
    }

    private assertAcceptingFork (forkId: string): void{
        if (this._status !== SmTransactionStatus.IDLE  && this._status !== SmTransactionStatus.RUNNING) {
            throw new Error(`ERROR FORKING ${this.request.name}/${forkId} this operation can only be performed when transaction is IDLE or RUNNING, currently the status of ${this.request.name} is ${this._status}`);
        }
    }

    private assertIdle (): void{
        if (this._status !== SmTransactionStatus.IDLE) {
            throw new Error(`this operation can only be performed when transaction is IDLE, currently the status is ${this._status}`);
        }
    }

    private assertNotClosed (): void{
        if (this._status === SmTransactionStatus.CLOSED) {
            throw new Error(`can't perform this operation on a transaction that has been already closed`);
        }
    }
}


