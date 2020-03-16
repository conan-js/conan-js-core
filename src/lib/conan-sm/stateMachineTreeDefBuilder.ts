import {IBiConsumer, IConstructor, IConsumer, IOptSetKeyValuePairs} from "../conan-utils/typesHelper";
import {ListenerType, SmListener, SmListenerDefLike, SmListenerDefLikeParser} from "./stateMachineListeners";
import {SmEventsPublisher, StateMachineTreeDef} from "./_domain";
import {Stage, StageLogic} from "./stage";


export type SyncListener<INTO_SM_ON_LISTENER extends SmListener,
    JOIN_SM_ON_LISTENER extends SmListener> = IOptSetKeyValuePairs<keyof INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>

export interface SyncStateMachineDef<
    SM_IF_LISTENER extends SmListener,
    INTO_SM_ON_LISTENER extends SmListener,
    JOIN_SM_ON_LISTENER extends SmListener,
> {
    stateMachineTreeDef: StateMachineTreeDef<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>,
    syncName: string,
    syncStartingPath?: string;
    joiner: SyncListener<INTO_SM_ON_LISTENER, SM_IF_LISTENER>,
    initCb?: IConsumer<StateMachineTreeDef<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>>
}


export interface StateMachineBuilderEndpoint<
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
        treeStateMachineDef: StateMachineTreeDef<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>,
        joiner: SyncListener<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>,
        initCb?: IConsumer<StateMachineTreeDef<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>>
    ): this;
}

export class StateMachineTreeDefBuilder<
    SM_ON_LISTENER extends SmListener,
> implements StateMachineBuilderEndpoint<SM_ON_LISTENER> {
    private readonly smListenerDefLikeParser: SmListenerDefLikeParser = new SmListenerDefLikeParser();

    public stateMachineTreeDef: StateMachineTreeDef<SM_ON_LISTENER, SM_ON_LISTENER> = {
        initialListener: undefined,
        listeners: [],
        interceptors: [],
        name: undefined,
        syncDefs: [],
        stageDefs: [],
    };

    constructor(
        private readonly initialListener?: SmListenerDefLike<SM_ON_LISTENER>
    ) {
        if (initialListener) {
            this.stateMachineTreeDef.initialListener = this.smListenerDefLikeParser.parse(initialListener, ListenerType.ONCE);
        }
    }

    private started: boolean = false;

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.stateMachineTreeDef.listeners.push(
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
        this.stateMachineTreeDef.stageDefs.push({
            name: stateName,
            logic,
        });
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
        this.stateMachineTreeDef.stageDefs.push({
            name,
            logic,
            deferredInfo: {
                deferrer,
                joinsInto
            }
        });
        return this;
    }


    nextConditionally(ifStageListeners: any): this {
        throw new Error('TBI')
    }

    sync<INTO_SM_ON_LISTENER extends SmListener,
        JOIN_SM_ON_LISTENER extends SmListener>(
        name: string,
        treeStateMachineDef: StateMachineTreeDef<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>,
        joiner: SyncListener<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>,
        initCb?: IConsumer<StateMachineTreeDef<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>>
    ): this {
        if (this.started) throw new Error("can't modify the behaviour of a state machine once that it has started");
        this.stateMachineTreeDef.syncDefs.push({
            stateMachineTreeDef: treeStateMachineDef,
            syncName: name,
            joiner: joiner as unknown as SyncListener<any, SM_ON_LISTENER>,
            initCb
        });
        return this;
    }

    withName(name: string) {
        this.stateMachineTreeDef.name = name;
    }

    build (): StateMachineTreeDef<SM_ON_LISTENER, SM_ON_LISTENER> {
        return this.stateMachineTreeDef;
    }
}
