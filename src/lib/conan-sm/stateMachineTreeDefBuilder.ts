import {IBiConsumer, IConstructor, IConsumer} from "../conan-utils/typesHelper";
import {ListenerType, SmListener, SmListenerDefLike, SmListenerDefLikeParser} from "./stateMachineListeners";
import {SmEventsPublisher} from "./_domain";
import {Stage, StageDef, StageLogic} from "./stage";
import {StateMachineTreeDef, SyncListener} from "./stateMachineTreeDef";


export interface StateMachineBuilderEndpoint
<
    SM_ON_LISTENER extends SmListener,
> extends SmEventsPublisher <SM_ON_LISTENER, SM_ON_LISTENER>{
    withState<
        ACTIONS,
        DATA = void>
    (
        stateName: string,
        logic: StageLogic<ACTIONS, DATA>,
    ): this;

    withDeferredStage<
        NAME extends string,
        ACTIONS,
        REQUIREMENTS = void
    >(
        name: NAME,
        logic: IConstructor<ACTIONS, REQUIREMENTS>,
        deferrer: IBiConsumer<ACTIONS, REQUIREMENTS>,
        joinsInto: string[]
    ): this;

    sync<
        INTO_SM_ON_LISTENER extends SmListener,
        JOIN_SM_ON_LISTENER extends SmListener
    >(
        name: string,
        treeStateMachineDef: StateMachineBuilderEndpoint <SM_ON_LISTENER>,
        joiner: SyncListener<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>,
        initCb?: IConsumer<StateMachineTreeDef<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>>
    ): this;
}

export class StateMachineTreeDefBuilder<
    SM_ON_LISTENER extends SmListener,
> implements StateMachineBuilderEndpoint<SM_ON_LISTENER> {
    private readonly smListenerDefLikeParser: SmListenerDefLikeParser = new SmListenerDefLikeParser();

    public stateMachineTreeDef: StateMachineTreeDef<SM_ON_LISTENER, SM_ON_LISTENER> = {
        rootDef:{
            listeners: [],
            interceptors: [],
            name: undefined,
            stageDefsByKey: {},
        },
        syncDefs: [],
    };

    private started: boolean = false;

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.stateMachineTreeDef.rootDef.listeners.push(
            this.smListenerDefLikeParser.parse(listener, type)
        );
        return this;
    }

    addInterceptor(interceptor: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        throw new Error('TBI');
    }

    withInitialState<
        DATA = void
    > (
        stateName: string,
        data?: DATA,
    ): this {
        this.withState<any>('start', () => ({
            doInitialise: (initialData: DATA): Stage<any, DATA> => ({
                stateName: stateName,
                ...initialData ? {data: initialData}: undefined
            })
        }))
        .addListener([`::start=>doInitialise`, {
            onStart: (actions: any) => actions.doInitialise(data)
        } as any,], ListenerType.ONCE);
        return this;
    }


    withState<
        ACTIONS,
        DATA = void
    >(
        stateName: string,
        logic: StageLogic<ACTIONS, DATA>,
    ): this {
        this.stateMachineTreeDef.rootDef.stageDefsByKey [stateName] = {
            logic: logic,
            name: stateName
        } as StageDef<any, any, any>;
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
        this.stateMachineTreeDef.rootDef.stageDefsByKey[name] = {
            name: name,
            logic: logic,
            deferredInfo: {
                deferrer: deferrer,
                joinsInto: joinsInto
            }
        } as StageDef<NAME, ACTIONS, any, REQUIREMENTS>;
        return this;
    }
    sync<INTO_SM_ON_LISTENER extends SmListener,
        JOIN_SM_ON_LISTENER extends SmListener>(
        name: string,
        treeStateMachineDef: StateMachineBuilderEndpoint <SM_ON_LISTENER>,
        joiner: SyncListener<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>,
        initCb?: IConsumer<StateMachineTreeDef<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>>
    ): this {
        throw new Error('TBI');
    }

    withName(name: string) {
        this.stateMachineTreeDef.rootDef.name = name;
    }

    build (): StateMachineTreeDef<SM_ON_LISTENER, SM_ON_LISTENER> {
        return this.stateMachineTreeDef;
    }
}
