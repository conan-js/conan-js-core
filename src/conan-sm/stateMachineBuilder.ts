import {StateMachineDefBuilder, StateMachineEndpoint} from "./core/stateMachineDefBuilder";
import {SmListener, SmListenerDefLike} from "./events/stateMachineListeners";
import {ReactionType} from "./reactions/reactor";
import {StateDef} from "./core/stateDef";
import {StateMachineFactory} from "./stateMachineFactory";
import {IFunction, IProducer} from "../conan-utils/typesHelper";
import {StateMachineFacade} from "../stateMachineFacade";
import {AsapLike} from "../conan-utils/asap";
import {State} from "./core/state";

export type StateMachineBuilder$ <
    SM_ON_LISTENER extends SmListener,
    PARAMS = void,
    STARTER = AsapLike<State<any>>
> = IFunction<PARAMS, StateMachineBuilder<SM_ON_LISTENER, STARTER>>;

export class StateMachineBuilder<
    SM_ON_LISTENER extends SmListener,
    STARTER = AsapLike<State<any>>
> implements StateMachineEndpoint<SM_ON_LISTENER, STARTER>{
    private stateMachineDefBuilder: StateMachineDefBuilder<SM_ON_LISTENER, STARTER> = new StateMachineDefBuilder();

    addInterceptor(interceptor: SmListenerDefLike<any>): this {
        this.stateMachineDefBuilder.addInterceptor(interceptor);
        return this;
    }

    addListener(listener: SmListenerDefLike<any>, type?: ReactionType): this {
        this.stateMachineDefBuilder.addListener(listener, type);
        return this;
    }

    withState<PATHS, DATA = void>(stateDef: StateDef<PATHS, DATA>): this {
        this.stateMachineDefBuilder.withState(stateDef);
        return this;
    }

    withStarter(mapper: IFunction<STARTER, AsapLike<State<any>>>): this {
        this.stateMachineDefBuilder.withStarter(mapper);
        return this;
    }

    build(name: string): StateMachineFacade<SM_ON_LISTENER, STARTER> {
        this.stateMachineDefBuilder.withName(name);
        return StateMachineFactory.create<SM_ON_LISTENER, STARTER>(
            this.stateMachineDefBuilder.build()
        );
    }

    if(condition: IProducer<boolean>, ifTrue: IFunction<this, this>): this {
        this.stateMachineDefBuilder.if(condition, ifTrue as any);
        return this;
    }

}
