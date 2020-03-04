import {Transaction, TransactionRequest, TransactionStatus} from "./transaction";


export class TransactionTree {
    private _root: Transaction;

    createOrForkTransaction(
        request: TransactionRequest
    ): Transaction {
        if (!this.getCurrentTransaction()) {
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
        if (!this.getCurrentTransaction()) return '-';
        return this.getCurrentTransaction().getId();
    }


    private getCurrentTransaction(): Transaction {
        return this._root == null ? null : this._root.getCurrentRunningTransaction()
    }
}
