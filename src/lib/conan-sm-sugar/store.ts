import {OnEventCallback, SmListener} from "../conan-sm/stateMachineListeners";
import {IFunction} from "../conan-utils/typesHelper";
import {State} from "../conan-sm/state";
import {Proxyfier} from "../conan-utils/proxyfier";
import {SmPrototype} from "./smPrototype";
import {StateMachineCoreDefBuilder} from "../conan-sm/core/stateMachineCoreDefBuilder";

export type Store<ACTIONS> = SmPrototype<NextDataListener<ACTIONS>>;

export interface NextDataListener<ACTIONS> extends SmListener<ACTIONS> {
    onNextData?: OnEventCallback<ACTIONS>;
}

export interface NextData<DATA> extends State <'nextData', DATA> {}

export class StoreFactory {
    static create <DATA, ACTIONS> (initialData: DATA, actionsProducer: IFunction<DATA, ACTIONS>):  Store<ACTIONS>{
        return new SmPrototype(new StateMachineCoreDefBuilder<NextDataListener<ACTIONS>>()
            .withInitialState('nextData', initialData)
            .withState<ACTIONS, DATA>('nextData', (prevState) => {
                let nextData: ACTIONS = actionsProducer(prevState);
                return Proxyfier.proxy(nextData, (raw): NextData<DATA> => {
                    let rawData: DATA = raw();
                    return {
                        name: "nextData",
                        data: rawData
                    };
                });
            }));
    }
}

