import {SmListener} from "../conan-sm/events/stateMachineListeners";
import {IFunction} from "../conan-utils/typesHelper";
import {State} from "../conan-sm/core/state";
import {Proxyfier} from "../conan-utils/proxyfier";
import {Reaction} from "../conan-sm/reactions/reactor";
import {StateMachineBuilder} from "../conan-sm/stateMachineBuilder";
import {StateLogic} from "../conan-sm/reactions/reactorFactory";
import {StateMachineFacade} from "../stateMachineFacade";
import {AsapLike, AsapParser} from "../conan-utils/asap";

export type Store<ACTIONS, STARTER = AsapLike<State<any>>> = StateMachineFacade<NextDataListener<ACTIONS>, STARTER>;
export type SimpleStore<DATA, STARTER = AsapLike<State<any>>> = StateMachineFacade<NextDataListener<SimpleActions<DATA>>, STARTER>;

export interface NextDataListener<ACTIONS> extends SmListener<ACTIONS> {
    onNextData?: Reaction<ACTIONS>;
}

export type NextDataState<DATA> =State <'nextData', DATA>;
export interface NextPathData<DATA> extends State <'nextData', DATA> {}

export type StoreBuilder<ACTIONS, STARTER = AsapLike<State<any>>> = StateMachineBuilder<NextDataListener<ACTIONS>, STARTER>;

export interface StoreOptions<DATA, ACTIONS, STARTER = AsapLike<State<any>>> {
    deferrer?: StateLogic<ACTIONS>
    starter?: IFunction<STARTER, AsapLike<DATA>>
}

export type AutoStart = void;

export interface SimpleActions<DATA> {
    update (data: DATA): DATA;
}

export class StoreBuilderFactory {
    static simple <DATA, STARTER = AsapLike<State<any>>> (storeOptions?: StoreOptions<DATA, SimpleActions<DATA>, STARTER>) {
        return StoreBuilderFactory.withManyActions <DATA, SimpleActions<DATA>, STARTER>(
            () => ({
                update (newData: DATA): DATA {
                    return newData;
                }
            }),
            storeOptions
        )
    }

    static withManyActions <DATA, ACTIONS, STARTER = AsapLike<State<any>>> (
        NextPathsData$: IFunction<DATA, ACTIONS>,
        storeOptions?: StoreOptions<DATA, ACTIONS, STARTER>
    ): StoreBuilder<ACTIONS, STARTER>{
        return new StateMachineBuilder<NextDataListener<ACTIONS>, STARTER>()
                .withState<ACTIONS, DATA>({
                    name: 'nextData',
                    paths: (prevState) =>
                        Proxyfier.proxy(NextPathsData$(prevState), (raw): NextPathData<DATA> => ({
                            name: "nextData",
                            data: raw()
                        })),
                    ...!storeOptions || storeOptions.deferrer == null ? undefined : {logic: storeOptions.deferrer}
                })
            .if(()=>storeOptions && storeOptions.starter!=null, builder=> builder
                .withStarter((starter)=>AsapParser.from(storeOptions.starter(starter))
                    .map<NextDataState<DATA>>((data) => ({
                        name: 'nextData',
                        data
                    }))
                )
            )
    }
}

