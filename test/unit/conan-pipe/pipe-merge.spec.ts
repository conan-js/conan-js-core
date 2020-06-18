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
    }

    interface Merged {
        name: string,
        quantity: number,
        complex: {
            aString: string,
            type: string
        }
    }

    let left: ShapeA[] = [];
    let right: ShapeB[] = [];
    let merged: Merged[] = [];

    let FIRST_LEFT: ShapeA = {
        aNumber: 1,
        complex: {
            anotherString: 'anotherString',
            aString: 'aString'
        },
        name: 'name'
    };
    let left$ = Threads.create<ShapeA>({
        name: 'shapeA',
        reactions: [{
            name:`append`,
            reactionType: ReactionType.ALWAYS,
            action: (onNextData)=>left.push(onNextData.getData())
        }],
    })

    let FIRST_RIGHT: ShapeB = {
        quantity: 1,
        type: 'aA'
    };

    let right$ = Threads.create<ShapeB>({
        name: 'shapeB',
        reactions: [{
            name:`append`,
            reactionType: ReactionType.ALWAYS,
            action: (onNextData)=>right.push(onNextData.getData())
        }]
    })

    let BASE_VALUE = {
        name: undefined,
        quantity: undefined,
        complex: {
            aString: undefined,
            type: undefined
        }
    };
    Pipes.merge<ShapeA, ShapeB, Merged>(
        `mergeTest`,
        left$,
        (left, right, current)=>({
            ...current,
            name: left.name,
            complex: {
                ...current ? current.complex : undefined,
                aString: left.complex.aString
            }
        }),
        right$,
        (right, left, current)=>({
            ...current,
            quantity: right.quantity,
            complex: {
                ...current ? current.complex : undefined,
                type: right.type
            }
        }),
        {
            reactions: [{
                name: `append`,
                reactionType: ReactionType.ALWAYS,
                action: (onNextData) => merged.push(onNextData.getData())
            }],
            initialData: BASE_VALUE
        },
    )

    left$.do.update (FIRST_LEFT);
    right$.do.update (FIRST_RIGHT);



    let FIRST_MERGED: Merged = {
        complex: {
            aString: FIRST_LEFT.complex.aString,
            type: undefined
        },
        name: FIRST_LEFT.name,
        quantity: undefined
    }

    let SECOND_MERGED: Merged = {
        complex: {
            aString: FIRST_LEFT.complex.aString,
            type: 'aA'
        },
        name: FIRST_LEFT.name,
        quantity: 1
    }


    expect (left).to.deep.eq([FIRST_LEFT])
    expect (right).to.deep.eq([FIRST_RIGHT])
    expect (merged).to.deep.eq([BASE_VALUE, FIRST_MERGED, SECOND_MERGED])

})
