import {Rule} from "../../../../src/core/conan-utils/rules/_rules";
import {IKeyValuePairs} from "../../../../src/core";
import {Objects} from "../../../../src/core/conan-utils/objects";
import {expect} from "chai";
import {BooleanRules} from "../../../../src/core/conan-utils/rules/booleanRules";
import {BaseRules} from "../../../../src/core/conan-utils/rules/baseRules";
import {StringRules} from "../../../../src/core/conan-utils/rules/stringRules";
import {NumberRules} from "../../../../src/core/conan-utils/rules/numberRules";
import {ObjectRules} from "../../../../src/core/conan-utils/rules/objectRules";

describe (`rules`, function (){
    const AN_OBJECT = {};

    function test<T>(from: IKeyValuePairs<Rule<T>>, valuesToTest: T[], expectedPasses: IKeyValuePairs<any[]>) {
        Objects.foreachEntry<Rule>(from, (rule, ruleName) => {
            valuesToTest.forEach(valueToTest => {
                let result: boolean = rule.test(valueToTest);
                let passesForThisRule: any[] = expectedPasses[ruleName];
                if (passesForThisRule.indexOf(valueToTest) > -1) {
                    expect(result, `expecting [${valueToTest}] to be true, but it was false [${ruleName}] - {${rule.name}}`).to.be.true;
                } else {
                    expect(result, `expecting [${valueToTest}] to be false, but it was true [${ruleName}] - {${rule.name}}`).to.be.false;
                }
            })
        })
    }


    it (`should calculate simple rules`, function (){
        const rules: IKeyValuePairs<Rule> = {
            ifTrue: BooleanRules.ifTrue(),
            ifFalse: BooleanRules.ifFalse(),
            ifUndefined: BaseRules.ifUndefined(),
            ifNull: BaseRules.ifNull(),
            ifInitialised: BaseRules.ifInitialised(),
            ifEmptyString: StringRules.ifEmptyString(),
            ifUndefinedString: StringRules.ifUndefinedString(),
            ifNullUn: BaseRules.ifNullUn(),
            ifNumber: NumberRules.ifNumber(),
            ifObject: ObjectRules.ifObject()
        };


        const valuesToTest: any[] = [true, false, null, undefined, 0, '', 'as', 1, AN_OBJECT];

        const expectedPasses: IKeyValuePairs<any[]> = {
            ifTrue: [true],
            ifFalse: [false],
            ifUndefined: [undefined],
            ifNull: [null],
            ifNullUn: [null, undefined],
            ifString: ['', 'as'],
            ifInitialised: [false, true, '', 0, 'as', 1, AN_OBJECT],
            ifEmptyString: [''],
            ifUndefinedString: [null, undefined, ''],
            ifNumber: [0, 1],
            ifObject: [AN_OBJECT]
        };

        test(rules, valuesToTest, expectedPasses);
    })

    it (`should do simple operations`, function (){
        let rule: Rule<number> = NumberRules.ifNumber();

        expect(rule.negate).to.be.false;
        expect(rule.name).to.deep.eq('ifNumber');

        expect(rule.inverse().negate).to.be.true;
        expect(rule.inverse().name).to.deep.eq('!ifNumber');

        expect(rule.inverse().inverse().negate).to.be.false;
        expect(rule.inverse().inverse().name).to.deep.eq('ifNumber');

        let ifEven = rule.and( BaseRules.if('isEven', (number)=>number%2 === 0));
        expect(ifEven.name).to.deep.eq('AND=[ifNumber,isEven]')

        expect (ifEven.test(undefined)).to.be.false;
        expect (ifEven.test(1)).to.be.false;
        expect (ifEven.test(2)).to.be.true;


        let [evenAndGreaterThan5, evenAndSmallerThan5] = ifEven.split(BaseRules.if('greaterThan5', (value)=>value>5));
        expect(evenAndGreaterThan5.test(undefined)).to.be.false;
        expect(evenAndGreaterThan5.test(10)).to.be.true;
        expect(evenAndGreaterThan5.test(4)).to.be.false;

        expect(evenAndSmallerThan5.test(undefined)).to.be.false;
        expect(evenAndSmallerThan5.test(10)).to.be.false
        expect(evenAndSmallerThan5.test(4)).to.be.true;
    })

    it  (`should calculate custom, negative rules and combine AND`, function (){
        let [isEvenNumber, isOddNumber] = NumberRules.ifNumber().split (
            BaseRules.if('divisibleBy2', number => number % 2 === 0)
        )

        const customNumberRules: IKeyValuePairs<Rule<number>> = {
            ifNumberIsEven: isEvenNumber,
            ifNumberIsOdd: isOddNumber,
        };

        const valuesToTest: any[] = [null, undefined, 0, 2, 5, 12, 19];

        const expectedPasses: IKeyValuePairs<number[]> = {
            ifNumberIsEven: [0, 2, 12],
            ifNumberIsOdd: [5, 19],
        };

        test(customNumberRules, valuesToTest, expectedPasses);

    })

    it  (`object rules should work, and combine OR`, function () {
        let ifHasNameKey = ObjectRules
            .ifObject()
            .and(
                ObjectRules.hasKey('name')
            );
        expect(ifHasNameKey.test({name: 'a'})).to.be.true;

        let nameIsAlberto = ObjectRules.stringKey(
            'name',
            StringRules.equals('Alberto')
        );

        expect(nameIsAlberto.test({name: 'Alberto'})).to.be.true;
        expect(nameIsAlberto.test({name: 'Roberto'})).to.be.false;
        expect(nameIsAlberto.test({name1: 'Alberto'})).to.be.false;
        expect(nameIsAlberto.test(undefined)).to.be.false;
        expect(nameIsAlberto.test({})).to.be.false;

        let nameIsAlbertoOrRoberto = ObjectRules.stringKey(
            'name',
            BaseRules.combineOr<string>('Alberto or Roberto',
                StringRules.equals('Alberto'),
                StringRules.equals('Roberto'),
            )
        )

        expect(nameIsAlbertoOrRoberto.test({name: 'Alberto'})).to.be.true;
        expect(nameIsAlbertoOrRoberto.test({name: 'Roberto'})).to.be.true;
        expect(nameIsAlbertoOrRoberto.test({name: 'Anastasio'})).to.be.false;

        nameIsAlbertoOrRoberto = nameIsAlberto.or (ObjectRules.stringKey(
            'name',
            StringRules.equals('Roberto')
        ));

        expect(nameIsAlbertoOrRoberto.test({name: 'Alberto'})).to.be.true;
        expect(nameIsAlbertoOrRoberto.test({name: 'Roberto'})).to.be.true;
        expect(nameIsAlbertoOrRoberto.test({name: 'Anastasio'})).to.be.false;
    })
})
