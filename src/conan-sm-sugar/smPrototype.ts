import {ListenerType, SmListener, SmListenerDefLike} from "../conan-sm/core/stateMachineListeners";
import {IBiConsumer, IConstructor, IConsumer} from "../conan-utils/typesHelper";
import {StateMachineDef, SyncListener} from "../conan-sm/stateMachineDef";
import {StateLogic} from "../conan-sm/core/state";
import {StateMachine} from "../conan-sm/stateMachine";
import {StateMachineFactory} from "../conan-sm/stateMachineFactory";
import {StateMachineBuilderEndpoint, StateMachineCoreDefBuilder} from "../conan-sm/core/stateMachineCoreDefBuilder";

export class SmPrototype<SM_ON_LISTENER extends SmListener> implements StateMachineBuilderEndpoint <SM_ON_LISTENER> {
    constructor(
        private defBuilder: StateMachineCoreDefBuilder<SM_ON_LISTENER>
    ) {
    }

    start(name: string): StateMachine<SM_ON_LISTENER> {
        this.defBuilder.withName(name);
        return StateMachineFactory.create({
            rootDef: this.defBuilder.build(),
            syncDefs: undefined
        })
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
        treeStateMachineDef: StateMachineBuilderEndpoint <SM_ON_LISTENER>,
        joiner: SyncListener<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>,
        initCb?: IConsumer<StateMachineDef<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>>
    ): this {
        throw new Error('TBI');
        // this.defBuilder.sync(name, treeStateMachineDef, joiner, initCb);
        // return this;
    }

    withDeferredState<NAME extends string,
        ACTIONS,
        REQUIREMENTS = void>
    (
        name: NAME,
        logic: IConstructor<ACTIONS, REQUIREMENTS>,
        deferrer: IBiConsumer<ACTIONS, REQUIREMENTS>,
        joinsInto: string[]
    ): this {
        this.defBuilder.withDeferredState(name, logic, deferrer, joinsInto);
        return this;
    }

    withState<ACTIONS,
        DATA = void>(
        stateName: string,
        logic: StateLogic<ACTIONS, DATA>,
    ): this {
        this.defBuilder.withState(stateName, logic);
        return this;
    }
}
