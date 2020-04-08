import { StateMachineEndpoint } from "./core/stateMachineDefBuilder";
import { SmListener, SmListenerDefLike } from "./events/stateMachineListeners";
import { ReactionType } from "./reactions/reactor";
import { StateDef } from "./core/stateDef";
import { IFunction, IProducer } from "../conan-utils/typesHelper";
import { StateMachineFacade } from "../stateMachineFacade";
import { AsapLike } from "../conan-utils/asap";
import { State } from "./core/state";
export declare type StateMachineBuilder$<SM_ON_LISTENER extends SmListener, PARAMS> = IFunction<PARAMS, StateMachineBuilder<SM_ON_LISTENER>>;
export declare class StateMachineBuilder<SM_ON_LISTENER extends SmListener, STARTER = AsapLike<State<any>>> implements StateMachineEndpoint<SM_ON_LISTENER, STARTER> {
    private stateMachineDefBuilder;
    addInterceptor(interceptor: SmListenerDefLike<any>): this;
    addListener(listener: SmListenerDefLike<any>, type?: ReactionType): this;
    withState<PATHS, DATA = void>(stateDef: StateDef<PATHS, DATA>): this;
    withStartMapper(mapper: IFunction<STARTER, AsapLike<State<any>>>): this;
    build(name: string): StateMachineFacade<SM_ON_LISTENER, STARTER>;
    if(condition: IProducer<boolean>, ifTrue: IFunction<this, this>): this;
}
