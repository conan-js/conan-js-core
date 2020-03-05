import {Transaction, TransactionRequest, TransactionStatus} from "./transaction";
import {ICallback} from "../conan-utils/typesHelper";


export class TransactionTree {
    private _root: Transaction;

    createOrQueueTransaction(
        request: TransactionRequest,
        onCreatingNewTree?: ICallback
    ): Transaction {
        if (!this.getCurrentTransaction()) {
            if (onCreatingNewTree) {
                onCreatingNewTree();
            }
            this._root = new Transaction(request);
        } else {
            this.getCurrentTransaction().fork(request);
        }

        let currentExecution = this.getCurrentTransaction();
        if (currentExecution.status === TransactionStatus.IDLE) {
            currentExecution.run();
        }
        return currentExecution;
    }

    getCurrentTransactionId() {
        if (!this.getCurrentTransaction()) return undefined;
        return this.getCurrentTransaction().getId();
    }


    getCurrentTransactionName() {
        if (!this.getCurrentTransaction()) return undefined;
        return this.getCurrentTransaction().getThisName();
    }

    private getCurrentTransaction(): Transaction {
        return this._root == null ? null : this._root.getCurrentRunningTransaction()
    }
}
