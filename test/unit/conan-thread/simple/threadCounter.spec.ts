import {expect} from "chai";
import {Threads} from "../../../../../src/core/conan-thread/factories/threads";
import {Reducers} from "../../../../../src/core/conan-thread/domain/reducers";
import {ThreadFacade} from "../../../../../src/core/conan-thread/domain/threadFacade";


describe(`counter`, function () {
    interface CounterMutators extends Reducers<number>{
        $increaseByOne (): number
    }

    let counter: ThreadFacade<number, CounterMutators> = Threads.create<number, CounterMutators>({
        name: 'counter',
        initialData: 0,
        reducers: (getData) => ({
            $increaseByOne(): number {
                return getData() + 1;
            }
        })
    })

    it(`should let us create a counter with reactions`, () => {
        counter.next((onNumberUpdated)=> {
            onNumberUpdated.do.$increaseByOne();
            counter.next((onNumberUpdated) =>
                onNumberUpdated.do.$increaseByOne()
            );
        })

        counter.stop(events =>{
            expect(
                events.serializeStates(
                    {excludeStop: true, excludeInit: true}
                ).map(it=>it.data)
            ).to.deep.eq([0, 1, 2])
        });
    })

    it(`should let us create a counter with actions`, () => {
        counter.start();
        counter.do.$increaseByOne();
        counter.do.$increaseByOne();

        counter.stop(events =>{
            expect(
                events.serializeStates(
                    {excludeStop: true, excludeInit: true}
                ).map(it=>it.data)
            ).to.deep.eq([0, 1, 2])
        });
    })

    it (`should let us do a counter with no mutators`, ()=>{
        let counter = Threads.create<number>({
            name: 'counter',
            initialData: 0
        });

        counter.do.update ((current)=>current+1)
        counter.do.update ((current)=>current+1)
        counter.stop(events =>{
            expect(
                events.serializeStates(
                    {excludeStop: true, excludeInit: true}
                ).map(it=>it.data)
            ).to.deep.eq([0, 1, 2])
        });
    })

    it (`should let us do a counter with no intial state`, ()=>{
        let counter = Threads.create<number>({
            name: 'counter',
        });

        counter.do.update (0)
        counter.do.update ((current)=>current+1)
        counter.stop(events =>{
            expect(
                events.serializeStates(
                    {excludeStop: true, excludeInit: true}
                ).map(it=>it.data)
            ).to.deep.eq([0, 1])
        });
    })
})
