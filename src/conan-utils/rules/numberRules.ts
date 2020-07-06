import {IPredicate} from "../typesHelper";
import {BaseRules} from "./baseRules";
import {Rule} from "./_rules";

class NumberPredicates {
    static isNumber(): IPredicate<any> {
        return (value)=>typeof value === "number";
    }
}

export class NumberRules {

    static ifNumber(): Rule {
        return BaseRules.if('ifNumber', NumberPredicates.isNumber());
    }


}

