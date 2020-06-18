import {expect} from "chai";
import {Threads} from "../../../../src/core/conan-thread/factories/threads";
import {Pipes} from "../../../../src/core/conan-pipe/factories/pipes";

it (`should let us filter state`, function (){
    let numbers: number[]=[];
    let oddNumbers: number[]=[];

    let numbers$ = Threads.create<number>({
        name: 'numbers',
        reactions: [(onNextData)=>numbers.push(onNextData.getData())]
    });

    Pipes.filter<number>(
        'odd-number',
        numbers$,
        number=>number % 2 !== 0, {
            reactions: [(onNextData)=>oddNumbers.push(onNextData.getData())]
        }
    );

    numbers$.do.update(0);
    numbers$.do.update(1);
    numbers$.do.update(2);
    numbers$.do.update(3);

    expect (numbers).to.deep.eq ([0,1,2,3])
    expect (oddNumbers).to.deep.eq ([1,3])

})
