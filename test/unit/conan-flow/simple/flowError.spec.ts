import {Flows} from "../../../../../src/core";
import {Mutators} from "../../../../../src/core/conan-flow/domain/mutators";

describe(`error mgmnt`, function (){
    xit (`it should not go tits up if an error is thrown`, function (){
        interface CounterFlow {
            numberUpdated: number;
        }

        interface CounterFlowMutators extends Mutators<CounterFlow>{
            numberUpdated: {
                $increaseByOne (): number
            }
        }


        let counter$ = Flows.create<
            CounterFlow,
            CounterFlowMutators
        >({
            name: 'counter',
            statuses: {
                numberUpdated:  {
                    steps: () =>({
                        $increaseByOne (): number {
                            throw new Error(`Ooops`)
                        }
                    })
                },
            },
            initialStatus: {
                name: 'numberUpdated',
                data: 0
            },
        }).start();


        counter$.onceOn('numberUpdated', (onNumberUpdated)=>{
            onNumberUpdated.log('do I get here?');
            onNumberUpdated.do.$increaseByOne()
        });

    })
})
