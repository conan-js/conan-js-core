import {IBiFunction} from "./typesHelper";

export class Lists {
    static mergeCombine<FROM, TO_MERGE_COMBINE> (
        from: FROM[],
        toMerge: TO_MERGE_COMBINE [],
        comparator: IBiFunction<FROM, TO_MERGE_COMBINE, boolean>,
        merger: IBiFunction<FROM, TO_MERGE_COMBINE, TO_MERGE_COMBINE>
    ): TO_MERGE_COMBINE[] {
        let result: TO_MERGE_COMBINE[] = [];
        let anythingChanged: boolean = false;
        result = toMerge.map(it => {
            for (let inSrc of from) {
                if (comparator(inSrc, it)) {
                    anythingChanged = true;
                    return merger(inSrc, it)
                }
            }
            return it;
        })

        return anythingChanged ? result : toMerge;
    }
}
