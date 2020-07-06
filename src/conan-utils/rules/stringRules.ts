import {IPredicate} from "../typesHelper";
import {BaseRules} from "./baseRules";
import {Rule} from "./_rules";

class StringPredicates {
    static isString(): IPredicate<any> {
        return (value)=>typeof value === "string";
    }
}

export class StringRules {
    static ifString(): Rule {
        return BaseRules.if('ifString', StringPredicates.isString());
    }


    static ifEmptyString(): Rule {
        return BaseRules.compareByReference('ifEmptyString', '');
    }

    static ifUndefinedString(): Rule {
        return BaseRules.combineOr(
            'ifUndefinedString',
            StringRules.ifEmptyString(),
            BaseRules.ifNullUn()
        );
    }

    static equals(toCheck: string) {
        return BaseRules.compareByReference(`stringEquals=${toCheck}`, toCheck);
    }
}

