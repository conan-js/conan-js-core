import { SmListener } from "../conan-sm/events/stateMachineListeners";
import { IFunction } from "../conan-utils/typesHelper";
import { State } from "../conan-sm/core/state";
import { Reaction } from "../conan-sm/reactions/reactor";
import { StateMachineBuilder } from "../conan-sm/stateMachineBuilder";
import { StateLogic } from "../conan-sm/reactions/reactorFactory";
import { StateMachineFacade } from "../stateMachineFacade";
import { AsapLike } from "../conan-utils/asap";
export declare type Store<ACTIONS> = StateMachineFacade<NextDataListener<ACTIONS>>;
export interface NextDataListener<ACTIONS> extends SmListener<ACTIONS> {
    onNextData?: Reaction<ACTIONS>;
}
export declare type NextDataState<DATA> = State<'nextData', DATA>;
export interface NextPathData<DATA> extends State<'nextData', DATA> {
}
export declare type StoreBuilder<ACTIONS, STARTER = AsapLike<State<any>>> = StateMachineBuilder<NextDataListener<ACTIONS>, STARTER>;
export interface StoreOptions<ACTIONS, STARTER = AsapLike<State<any>>> {
    StateLogic?: StateLogic<ACTIONS>;
    starter?: IFunction<STARTER, AsapLike<State<any>>>;
}
export declare class StoreBuilderFactory {
    static create<DATA, ACTIONS, STARTER = AsapLike<State<any>>>(NextPathsData$: IFunction<DATA, ACTIONS>, storeOptions?: StoreOptions<ACTIONS, STARTER>): StoreBuilder<ACTIONS, STARTER>;
}
