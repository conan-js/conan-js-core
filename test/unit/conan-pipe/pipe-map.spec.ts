import {expect} from "chai";
import {Pipes} from "../../../../src/core/conan-pipe/factories/pipes";
import {Threads} from "../../../../src/core/conan-thread/factories/threads";
import {ReactionType} from "../../../../src/core/conan-flow/domain/reactions";

it (`should let us merge two states into one completely different`, function (){
    interface ShapeA {
        name: string,
        aNumber: number,
        complex: {
            aString: string,
            anotherString: string,
        }
    }

    interface ShapeB {
        type: string,
        quantity: number,
        aString: string
    }

    let src: ShapeA[] = [];
    let mapped: ShapeB[] = [];

    let FIRST_SRC: ShapeA = {
        aNumber: 1,
        complex: {
            anotherString: 'anotherString',
            aString: 'aString'
        },
        name: 'name'
    };

    let src$ = Threads.create<ShapeA>({
        name: 'shapeA',
        reactions: [{
            name:`append`,
            reactionType: ReactionType.ALWAYS,
            action: (onNextData)=>src.push(onNextData.getData())
        }],
    })


    Pipes.map<ShapeA, ShapeB>(
        `mergeTest`,
        src$,
        (left)=>({
            type: 'theType',
            quantity: 1,
            aString: left.complex.aString
        }),
        {
            reactions: [{
                name: `echo`,
                reactionType: ReactionType.ALWAYS,
                action: (onNextData)=>mapped.push(onNextData.getData())
            }]
        }
    )

    src$.do.update (FIRST_SRC);


    expect (src).to.deep.eq([FIRST_SRC])
    expect (mapped).to.deep.eq([{
        aString: 'aString',
        quantity: 1,
        type: 'theType'
    } as ShapeB])

})
