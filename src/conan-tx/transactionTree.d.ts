import { Transaction, TransactionRequest } from "./transaction";
import { ICallback } from "../conan-utils/typesHelper";
export declare class TransactionTree {
    private _root;
    createOrQueueTransaction(request: TransactionRequest, onRootTransactionCompleted: ICallback, onCreatingNewTree?: ICallback): Transaction;
    getCurrentTransactionId(): string;
    getCurrentTransactionName(): string;
    private getCurrentTransaction;
}
