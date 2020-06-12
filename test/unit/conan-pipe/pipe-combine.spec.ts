import {expect} from "chai";
import {Threads} from "../../../../src/core/conan-thread/factories/threads";
import {Pipes} from "../../../../src/core/conan-pipe/factories/factories";
import {ThreadFacade} from "../../../../src/core/conan-thread/domain/threadFacade";

describe(`combining states`, function () {
    let stringReactions:string[] = [];
    let numberReactions:number[] = [];

    let string$ : ThreadFacade<string> = Threads.create<string>({
        name: 'string',
        initialData: 'a'
    });
    let number$: ThreadFacade<number> = Threads.create<number>({
        name: 'number',
        initialData: 1
    })

    string$.addReaction({
        name: `string reaction`,
        dataConsumer: (value)=>stringReactions.push(value)
    });

    number$.addReaction({
        name: `number reaction`,
        dataConsumer: (value)=>numberReactions.push(value)
    });

    it (`should let us combine tuples`, function (){
        let stringAndNumberReactions:[number, string][] = [];
        interface CombinedActions{
            setNumber (value: number): void;
            setString (value: string): void;
        }

        let stringAndNumber$: ThreadFacade<[number, string], {}, CombinedActions> = Pipes.tupleCombine<number, string, CombinedActions>(
            number$,
            string$,
            [0, 'a'],
            {
                actions: thread=>({
                    setNumber(value: number) {
                        number$.do.update(value);
                    },
                    setString(value: string) {
                        string$.do.update(value);
                    }
                })
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
        interface CombinedObject {
            theNumber: number,
            theString: string
        }

        // Pipes.objectCombine <CombinedObject> ([
        //     ['theNumber', number$],
        //     ['theString', number$],
        // ])
    })
})
