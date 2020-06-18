import {expect} from "chai";
import {Threads} from "../../../../src/core/conan-thread/factories/threads";
import {Pipes} from "../../../../src/core/conan-pipe/factories/pipes";
import {ThreadFacade} from "../../../../src/core/conan-thread/domain/threadFacade";
import {ReactionType} from "../../../../src/core/conan-flow/domain/reactions";

describe(`combining states`, function () {
    let stringReactions:string[];
    let numberReactions:number[];

    let String$ = ()=>Threads.create<string>({
        name: 'string',
        initialData: 'a',
        reactions: [{
            action: (onNextData)=>stringReactions.push(onNextData.getData()),
            reactionType: ReactionType.ALWAYS,
            name: ''
        }]
    }) as ThreadFacade<string>;

    let Number$ = ()=>Threads.create<number>({
        name: 'number',
        initialData: 1,
        reactions: [{
            action: (onNextData)=>numberReactions.push(onNextData.getData()),
            reactionType: ReactionType.ALWAYS,
            name: ''
        }]

    }) as ThreadFacade<number>;

    interface CombinedActions{
        setNumber (value: number): void;
        setString (value: string): void;
    }
    it (`should let us combine tuples`, function (){
        stringReactions = [];
        numberReactions = [];

        let number$ = Number$();
        let string$ = String$();

        let stringAndNumberReactions:[number, string][] = [];

        let stringAndNumber$: ThreadFacade<[number, string], {}, CombinedActions> = Pipes.tupleCombine<number, string, CombinedActions>(
            `test tuple combine`,
            number$,
            string$,
            {
                actions: thread=>({
                    setNumber(value: number) {
                        number$.do.update(value);
                    },
                    setString(value: string) {
                        string$.do.update(value);
                    }
                }),
                initialData: [0, 'a']
            }
        );

        stringAndNumber$.addReaction({
            name: `number reaction`,
            dataConsumer: (value)=>stringAndNumberReactions.push(value)
        })

        number$.reducers.$update(2);
        string$.reducers.$update('b');

        string$.reducers.$update('c');
        number$.reducers.$update(3);


        stringAndNumber$.reducers.$update([4, 'd']);

        number$.reducers.$update(5);
        string$.reducers.$update('e');

        stringAndNumber$.do.setNumber(1);
        stringAndNumber$.do.setString('a');

        expect (stringReactions).to.deep.eq(['a','b','c','e','a']);
        expect (numberReactions).to.deep.eq([1, 2, 3, 5, 1]);
        expect (stringAndNumberReactions).to.deep.eq([
            [1, 'a'],
            [2, 'a'], [2, 'b'],
            [2, 'c'], [3, 'c'],
            [4, 'd'],
            [5, 'd'], [5, 'e'],
            [1, 'e'], [1, 'a'],
        ]);

    })

    it (`should let us combine into objects`, function (){
        stringReactions = [];
        numberReactions = [];

        let stringAndNumberReactions:CombinedObject[] = [];

        interface CombinedObject {
            theNumber: number,
            theString: string
        }

        let number$ = Number$();
        let string$ = String$();

        let stringAndNumber$: ThreadFacade<CombinedObject, {}, CombinedActions> = Pipes.combine <CombinedObject, CombinedActions> (
            'numberAndString',
            {
                theNumber: number$,
                theString: string$
            },
            {
                reactions: [{
                    name: `store data`,
                    reactionType: ReactionType.ALWAYS,
                    action: (onNextData)=>stringAndNumberReactions.push(onNextData.getData())
                }],
                actions: ()=>({
                    setString(value: string) {
                        string$.do.update(value)
                    },
                    setNumber(value: number) {
                        number$.do.update(value)
                    }
                }),
                initialData: {
                    theNumber: undefined,
                    theString: undefined
                }
            },
        )

        number$.reducers.$update(2);
        string$.reducers.$update('b');

        string$.reducers.$update('c');
        number$.reducers.$update(3);


        stringAndNumber$.reducers.$update({
            theNumber: 4,
            theString: 'd'
        });

        number$.reducers.$update(5);
        string$.reducers.$update('e');

        stringAndNumber$.do.setNumber(1);
        stringAndNumber$.do.setString('a');

        expect (stringReactions).to.deep.eq(['a','b','c','e','a']);
        expect (numberReactions).to.deep.eq([1, 2, 3, 5, 1]);
        expect (stringAndNumberReactions).to.deep.eq([
            {
                "theNumber": undefined,
                "theString": undefined
            },
            {
                "theNumber": 1,
                "theString": undefined
            },
            {
                "theNumber": 1,
                "theString": "a"
            },
            {
                "theNumber": 2,
                "theString": "a"
            },
            {
                "theNumber": 2,
                "theString": "b"
            },
            {
                "theNumber": 2,
                "theString": "c"
            },
            {
                "theNumber": 3,
                "theString": "c"
            },
            {
                "theNumber": 4,
                "theString": "d"
            },
            {
                "theNumber": 5,
                "theString": "d"
            },
            {
                "theNumber": 5,
                "theString": "e"
            },
            {
                "theNumber": 1,
                "theString": "e"
            },
            {
                "theNumber": 1,
                "theString": "a"
            }
        ]);
    })
})
