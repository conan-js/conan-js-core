import {ListenerType, SmListener, SmListenerDefLike} from "../conan-sm/stateMachineListeners";
import {
    StateMachineBuilderEndpoint,
    StateMachineTreeDefBuilder,
    SyncListener
} from "../conan-sm/stateMachineTreeDefBuilder";
import {StateMachine, StateMachineTreeDef} from "../conan-sm/_domain";
import {StateMachineTreeStarter} from "../conan-sm/stateMachineTreeStarter";
import {IBiConsumer, IConstructor, IConsumer} from "../conan-utils/typesHelper";
import {StageLogic} from "../conan-sm/stage";

export class SmPrototype<SM_ON_LISTENER extends SmListener> implements StateMachineBuilderEndpoint <SM_ON_LISTENER> {
    constructor(
        private defBuilder: StateMachineTreeDefBuilder<SM_ON_LISTENER>
    ) {
    }

    start(name: string): StateMachine<SM_ON_LISTENER, {}> {
        this.defBuilder.withName(name);
        return new StateMachineTreeStarter().start(this.defBuilder.build())
    }

    addInterceptor(interceptor: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.defBuilder.addInterceptor(interceptor, type);
        return this;
    }

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.defBuilder.addListener(listener, type)
        return this;
    }

    sync<INTO_SM_ON_LISTENER extends SmListener, JOIN_SM_ON_LISTENER extends SmListener>(
        name: string,
        treeStateMachineDef: StateMachineTreeDef<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>,
        joiner: SyncListener<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>,
        initCb?: IConsumer<StateMachineTreeDef<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>>
    ): this {
        this.defBuilder.sync(name, treeStateMachineDef, joiner, initCb);
        return this;
    }

    withDeferredStage<NAME extends string,
        ACTIONS,
        REQUIREMENTS = void>
    (
        name: NAME,
        logic: IConstructor<ACTIONS, REQUIREMENTS>,
        deferrer: IBiConsumer<ACTIONS, REQUIREMENTS>,
        joinsInto: string[]
    ): this {
        this.defBuilder.withDeferredStage(name, logic, deferrer, joinsInto);
        return this;
    }

    withState<ACTIONS,
        DATA = void>(
        stateName: string,
        logic: StageLogic<ACTIONS, DATA>,
    ): this {
        this.defBuilder.withState(stateName, logic);
        return this;
    }
}
