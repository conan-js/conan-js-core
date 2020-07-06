import {IPredicate} from "../typesHelper";
import {BaseRules} from "./baseRules";


export type RuleLike<T> = Rule<T> | IPredicate<T>;

export class RuleLikeParser {
    static parse<T = any> (toParse: RuleLike<T>): Rule<T> {
        return RuleLikeParser.isRule(toParse) ? toParse as Rule<T>: BaseRules.if('-anonymous-', toParse as IPredicate<T>);
    }

    static isRule<T = any> (toParse: RuleLike<T>): boolean{
        return 'test' in toParse;
    }
}

export enum RuleType {
    COMBINED = 'COMBINED',
    SIMPLE = 'SIMPLE'
}

export interface Rule<T = any> {
    test(value: T): boolean;
    negate: boolean;
    ruleType: RuleType;
    name: string;
    inverse(): Rule<T>;
    and(rule: Rule<T>): Rule<T>;
    or(rule: Rule<T>): Rule<T>;
    split(additionalRule: Rule<T>): [Rule<T>, Rule<T>];
}

export enum LOGIC_OPERATOR {
    OR = 'OR',
    AND = 'AND',
}

export abstract class BaseRule<T> implements Rule<T>{
    abstract ruleType: RuleType;

    protected constructor(
        public readonly negate: boolean = false,
        public readonly baseName: string,
    ) {}


    abstract inverse(): Rule<T> ;

    split(additionalRule: Rule<T>): [Rule<T>, Rule<T>] {
        return [
            this.and(additionalRule),
            this.and(additionalRule.inverse ()),
        ];
    }

    test(value: T): boolean {
        let result = this.doEvaluate(value);
        return this.negate === true ? !result : result;
    }

    abstract doEvaluate (value: T): boolean;

    or(rule: Rule<T>): Rule<T> {
        return BaseRules.combineOr<T>(`OR`, this, rule);
    }

    and(rule: Rule<T>): Rule<T> {
        return BaseRules.combineAnd<T>(`AND`, this, rule);
    }

    get name (): string{
        return `${this.negate === true? '!': ''}${this.baseName}`;
    }
}

export class CombinedRule<T = any> extends BaseRule<T> implements Rule<T>{
    readonly ruleType: RuleType = RuleType.COMBINED;

    constructor(
        name: string,
        private readonly rules: Rule<T> [],
        private readonly operator: LOGIC_OPERATOR,
        negate: boolean = false
    ) {
        super(negate, name);
    }

    doEvaluate (value: T): boolean{
        for (let rule of this.rules) {
            let partial = rule.test(value);
            if (partial === true && this.operator === LOGIC_OPERATOR.OR) {
                return true;
            }
            if (partial === false && this.operator === LOGIC_OPERATOR.AND) {
                return false;
            }
        }

        return this.operator === LOGIC_OPERATOR.AND;
    }

    inverse(): Rule<T> {
        let newNegatedValue = !this.negate;
        return new CombinedRule(
            this.baseName,
            this.rules,
            this.operator,
            newNegatedValue
        );
    }

    get name (): string{
        return `${this.negate === true? '!': ''}${this.baseName}=[${this.rules.map(it=>it.name).join(',')}]`;
    }
}


export class SimpleRule<T = any> extends BaseRule<T> implements Rule<T> {
    readonly ruleType: RuleType = RuleType.SIMPLE;

    constructor(
        name: string,
        private readonly predicate: IPredicate<T>,
        negate: boolean = false
    ) {
        super(negate, name);
    }


    inverse(): Rule<T> {
        let newNegatedValue = !this.negate;
        return new SimpleRule(
            this.baseName,
            this.predicate,
            newNegatedValue
        );
    }

    doEvaluate(value: T): boolean {
        return this.predicate(value);
    }

}
