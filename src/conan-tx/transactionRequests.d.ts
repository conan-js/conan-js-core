import { Transaction, TransactionRequest } from "./transaction";
import { IConsumer } from "../conan-utils/typesHelper";
export declare class TransactionRequests {
    static enrich(toEnrich: TransactionRequest, eventName: string, enrichedFn: IConsumer<Transaction>, after?: boolean): TransactionRequest;
}
