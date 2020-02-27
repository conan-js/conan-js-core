import {Transaction} from "./transaction";

export interface TransactionRequest {
}

export class Transactions {
    createTransaction (transactionRequest: TransactionRequest): Transaction{
        return new Transaction();
    }
}
