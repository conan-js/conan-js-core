import {Transaction, TransactionRequest, TransactionStatus} from "./transaction";


export class TransactionTree {
    private _currentRootTransaction: Transaction;

    createOrForkTransaction(
        request: TransactionRequest
    ): Transaction {
        if (!this.getCurrentExecution()) {
            this._currentRootTransaction = new Transaction(request);
        } else {
            this.getCurrentExecution().fork(request);
        }

        let currentExecution = this.getCurrentExecution();
        if (currentExecution.status === TransactionStatus.IDLE) {
            currentExecution.run();
        }
        return currentExecution;
    }

    getCurrentTransactionId() {
        if (!this.getCurrentExecution()) return '-';
        return this.getCurrentExecution().getId();
    }


    private getCurrentExecution(): Transaction {
        return this._currentRootTransaction == null ? null : this._currentRootTransaction.getCurrentRunningTransaction()
    }
}
