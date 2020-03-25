import {Transaction, TransactionRequest} from "./transaction";
import {IConsumer} from "../conan-utils/typesHelper";

export class TransactionRequests {
    static enrich(
        toEnrich: TransactionRequest,
        eventName: string,
        enrichedFn: IConsumer<Transaction>,
        after: boolean = false
    ): TransactionRequest {
        // @ts-ignore
        let base = toEnrich[eventName];
        // @ts-ignore
        toEnrich[eventName] = base == null ? {metadata: `[log-${eventName}]`, value: enrichedFn} : {
            // @ts-ignore
            metadata: base.metadata,
            value: (tx: Transaction) => {
                if (!after) {
                    enrichedFn(tx);
                }
                // @ts-ignore
                base.value(tx);
                if (after) {
                    enrichedFn(tx)
                }
            }

        };
        return toEnrich;
    }

}
