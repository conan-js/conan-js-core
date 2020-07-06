import {IPredicate} from "../typesHelper";
import {BaseRules} from "./baseRules";
import {Rule} from "./_rules";


class ObjectPredicates {
    static hasKey(keyName: string): IPredicate<{ }> {
        return (value)=>keyName in value
    }

    static isObject(): IPredicate<any> {
        return (value)=>typeof value === "object";
    }
}

export class ObjectRules {
    static ifObject(): Rule<{}> {
        return BaseRules.combineAnd('ifObject',
            BaseRules.ifInitialised(),
            ObjectPredicates.isObject()
        );
    }


    static hasKey(name: string):Rule<{}> {
        return BaseRules.combineAnd<{}>(`hasKey[${name}]`,
            ObjectRules.ifObject(),
            ObjectPredicates.hasKey(name)
        );
    }

    static stringKey(keyName: string, stringRule: Rule<string>): Rule<{}> {
        return BaseRules.combineAnd<{}>(
            `key[${keyName}]->{${stringRule.name}`,
            ObjectRules.hasKey(keyName),
            BaseRules.join<{}, string>((value)=>value[keyName], stringRule)
        );
    }
}

