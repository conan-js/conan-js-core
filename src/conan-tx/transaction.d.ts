import { ICallback, IConsumer, IProducer, WithMetadata, WithMetadataArray } from "../conan-utils/typesHelper";
import { ReactionMetadata, Reaction } from "../conan-sm/reactions/reactor";
export interface TransactionRequest {
    name: string;
    onStart?: WithMetadata<IConsumer<Transaction>, string>;
    reactionsProducer: IProducer<WithMetadataArray<ICallback, ReactionMetadata>>;
    doChain?: WithMetadata<IProducer<TransactionRequest>, string>;
    onDone?: WithMetadata<IConsumer<Transaction>, string>;
    onReactionsProcessed: IConsumer<WithMetadataArray<Reaction<any>, ReactionMetadata>>;
}
export declare enum TransactionStatus {
    IDLE = "IDLE",
    STARTING = "STARTING",
    RUNNING = "RUNNING",
    RETRIEVING_CHAIN = "RETRIEVING_CHAIN",
    PROCESSING_QUEUE = "PROCESSING_QUEUE",
    CHAINING = "CHAINING",
    CLOSING = "CLOSING",
    CLOSED = "CLOSED"
}
export declare class TransactionError extends Error {
    constructor(message: string);
}
export declare class Transaction {
    private readonly request;
    readonly parent?: Transaction;
    private _queueTransactions;
    private _chainedTransition;
    private _delegatedTransition;
    constructor(request: TransactionRequest, parent?: Transaction);
    private _status;
    get status(): TransactionStatus;
    getId(): string;
    getThisName(): string;
    close(): void;
    fork(forkRequest: TransactionRequest): Transaction;
    run(): void;
    getCurrentRunningTransaction(): Transaction;
    private doChain;
    private assertAcceptingFork;
    private assertIdle;
    private assertNotClosed;
    private doRun;
}
