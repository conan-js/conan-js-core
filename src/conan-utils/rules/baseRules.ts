import {IFunction, IPredicate} from "../typesHelper";
import {CombinedRule, LOGIC_OPERATOR, Rule, RuleLike, RuleLikeParser, SimpleRule} from "./_rules";

class BasePredicates {
    static isUndefined(): IPredicate<any> {
        return BasePredicates.compareByReference(undefined);
    }

    static isNull(): IPredicate<any> {
        return BasePredicates.compareByReference(null);
    }

    static isNullUn(): IPredicate<any> {
        return (value)=>value == null;
    }

    static compareByReference (toCompareWith: any): IPredicate<any>{
        return (value)=> value === toCompareWith;
    }

    static isInitialised(): IPredicate<any> {
        return (value)=>value != null;
    }
}

export class BaseRules {
    static if<T>(name: string, predicate: IPredicate<T>): Rule<T> {
        return new SimpleRule(name, predicate);
    }

    static ifNot<T>(name: string, predicate: IPredicate<T>): Rule<T> {
        return new SimpleRule(name, predicate, true);
    }

    static ifUndefined(): Rule {
        return BaseRules.if('ifUndefined', BasePredicates.isUndefined());
    }

    static ifNull(): Rule {
        return BaseRules.if('ifNull', BasePredicates.isNull());
    }

    static ifNullUn(): Rule {
        return BaseRules.if('ifNullUn', BasePredicates.isNullUn());

    }

    static ifInitialised(): Rule {
        return BaseRules.if('ifInitialised', BasePredicates.isInitialised());
    }

    static compareByReference(name: string, toCompareWith: any): Rule{
        return BaseRules.if(name, BasePredicates.compareByReference(toCompareWith));
    }

    static combineAnd<T> (name: string, ...rules: RuleLike<T>[]): Rule<T> {
        let rulesParsed = rules.map(RuleLikeParser.parse);
        return new CombinedRule(
            name,
            rulesParsed,
            LOGIC_OPERATOR.AND
        );
    }

    static combineOr<T> (name: string, ...rules: RuleLike<T>[]): Rule<T> {
        return new CombinedRule(
            name,
            rules.map(RuleLikeParser.parse),
            LOGIC_OPERATOR.OR
        );
    }

    static join<FROM, INTO>(mapper: IFunction<FROM, INTO>, joiner: Rule<INTO>) {
        return BaseRules.if <FROM>(
            `join{${joiner.name}`,
            (value)=> {
                let nextValue: INTO = mapper(value);
                return joiner.test(nextValue);
            }
        );
    }
}

