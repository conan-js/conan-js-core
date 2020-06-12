import {Flows} from "../../../../../src/core/conan-flow/factories/flows";
import {Mutators} from "../../../../../src/core/conan-flow/domain/mutators";
import {expect} from "chai";


describe(`counter`, function () {
    it(`should let us create a counter`, () => {

        interface CounterFlow {
            numberUpdated: number;
        }

        interface CounterFlowMutators extends Mutators<CounterFlow>{
            numberUpdated: {
                $increaseByOne (): number
            }
        }

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

})
