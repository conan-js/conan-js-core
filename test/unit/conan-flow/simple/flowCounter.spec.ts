import {Flows} from "../../../../../src/core/conan-flow/factories/flows";
import {Mutators} from "../../../../../src/core/conan-flow/domain/mutators";
import {expect} from "chai";


describe(`counter`, function () {
    interface CounterFlow {
        numberUpdated: number;
    }

    interface CounterFlowMutators extends Mutators<CounterFlow>{
        numberUpdated: {
            $increaseByOne (): number
        }
    }

    it(`should let us create a counter`, () => {


        let counter = Flows.create<
            CounterFlow,
            CounterFlowMutators
        >({
            name: 'counter',
            statuses: {
                numberUpdated:  {
                    steps: getData =>({
                        $increaseByOne (): number {
                            return getData() + 1
                        }
                    })
                },
            },
            initialStatus: {
                name: 'numberUpdated',
                data: 0
            }
        })

        counter.start();

        counter.onceOn("numberUpdated", (onNumberUpdated)=> {
            onNumberUpdated.do.$increaseByOne();
            counter.onceOn("numberUpdated", (onNumberUpdated) =>
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


    it (`should let us create a counter without initial state`, ()=>{
        let counter$ = Flows.create<
            CounterFlow,
            CounterFlowMutators
            >({
            name: 'counter',
            statuses: {
                numberUpdated:  {
                    steps: getData =>({
                        $increaseByOne (): number {
                            return getData() + 1
                        }
                    })
                },
            },
        })

        counter$.start();

        counter$.on('numberUpdated').steps.$update(0);
        counter$.on('numberUpdated').steps.$increaseByOne();
        counter$.on('numberUpdated').steps.$increaseByOne();

        counter$.stop(events =>{
            expect(
                events.serializeStates(
                    {excludeStop: true, excludeInit: true}
                ).map(it=>it.data)
            ).to.deep.eq([0, 1, 2])
        });
    })

})
