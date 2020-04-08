import { SmListener, SmListenerDefLike } from "../events/stateMachineListeners";
import { SmEventsPublisher } from "../_domain";
import { ReactionType } from "../reactions/reactor";
import { StateDef } from "./stateDef";
import { AsapLike } from "../../conan-utils/asap";
import { State } from "./state";
import { IFunction, IProducer } from "../../conan-utils/typesHelper";
import { StateMachineDef } from "../stateMachineDef";
export interface StateMachineEndpoint<SM_ON_LISTENER extends SmListener, STARTER = AsapLike<State<any>>> extends SmEventsPublisher<SM_ON_LISTENER, SM_ON_LISTENER> {
    withState<PATHS, DATA = void>(stateDef: StateDef<PATHS, DATA>): this;
    withStartMapper(mapper: IFunction<STARTER, AsapLike<State<any>>>): this;
    if(condition: IProducer<boolean>, ifTrue: IFunction<this, this>): this;
}
export declare class StateMachineDefBuilder<SM_ON_LISTENER extends SmListener, STARTER = AsapLike<State<any>>> implements StateMachineEndpoint<SM_ON_LISTENER, STARTER> {
    private readonly smListenerDefLikeParser;
    stateMachineDef: StateMachineDef<SM_ON_LISTENER, STARTER>;
    constructor(base?: StateMachineDef<SM_ON_LISTENER, STARTER>);
    addInterceptor(interceptor: SmListenerDefLike<SM_ON_LISTENER>, type?: ReactionType): this;
    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type?: ReactionType): this;
    withState<ACTIONS, DATA = void>(stateDef: StateDef<ACTIONS, DATA>): this;
    withName(name: string): this;
    build(): StateMachineDef<SM_ON_LISTENER, STARTER>;
    withStartMapper(mapper: IFunction<STARTER, AsapLike<State<any>>>): this;
    if(condition: IProducer<boolean>, ifTrue: IFunction<this, this>): this;
}
