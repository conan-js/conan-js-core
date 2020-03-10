import {IBiConsumer, IConstructor, IConsumer, IOptSetKeyValuePairs} from "../conan-utils/typesHelper";
import {StateMachineTree} from "./stateMachineTree";
import {ListenerType, SmListener, SmListenerDefLike, SmListenerDefLikeParser} from "./stateMachineListeners";
import {SmController, SmEventsPublisher, StateMachineTreeBuilderData} from "./_domain";
import {Stage, StageLogic} from "./stage";


export type SyncListener<INTO_SM_ON_LISTENER extends SmListener,
    JOIN_SM_ON_LISTENER extends SmListener> = IOptSetKeyValuePairs<keyof INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>

export interface SyncStateMachineDef<SM_IF_LISTENER extends SmListener,
    INTO_SM_ON_LISTENER extends SmListener,
    JOIN_SM_ON_LISTENER extends SmListener,
    > {
    stateMachineBuilder: StateMachine<INTO_SM_ON_LISTENER>,
    syncName: string,
    syncStartingPath?: string;
    joiner: SyncListener<INTO_SM_ON_LISTENER, SM_IF_LISTENER>,
    initCb?: IConsumer<StateMachine<INTO_SM_ON_LISTENER>>
}


export class StateMachine<
    SM_ON_LISTENER extends SmListener,
> implements SmEventsPublisher <SM_ON_LISTENER, SM_ON_LISTENER> {
    private readonly smListenerDefLikeParser: SmListenerDefLikeParser = new SmListenerDefLikeParser();

    public request: StateMachineTreeBuilderData<SM_ON_LISTENER, SM_ON_LISTENER> = {
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
            this.request.initialListener = this.smListenerDefLikeParser.parse(initialListener, ListenerType.ONCE);
        }
    }

    private started: boolean = false;

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.request.listeners.push(
            this.smListenerDefLikeParser.parse(listener, type)
        );
        return this;
    }

    addInterceptor(interceptor: any): this {
        throw new Error('TBI');
    }

    withInitialState<
        DATA = void
    > (
        stateName: string,
        data: DATA,
    ): this {
        this.withState<any>('start', () => ({
            doInitialise: (initialData: DATA): Stage<any, DATA> => ({
                state: stateName,
                data: initialData
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
        this.request.stageDefs.push({
            name: stateName,
            logic,
        });
        return this;
    }


    withDeferredStage<NAME extends string,
        ACTIONS,
        REQUIREMENTS = void>(
        name: NAME,
        logic: IConstructor<ACTIONS, REQUIREMENTS>,
        deferrer: IBiConsumer<ACTIONS, REQUIREMENTS>,
        joinsInto: string[]
    ): this {
        this.request.stageDefs.push({
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
        stateMachine: StateMachine<INTO_SM_ON_LISTENER>,
        joiner: SyncListener<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>,
        initCb?: IConsumer<StateMachine<INTO_SM_ON_LISTENER>>
    ): this {
        if (this.started) throw new Error("can't modify the behaviour of a state machine once that it has started");
        this.request.syncDefs.push({
            stateMachineBuilder: stateMachine,
            syncName: name,
            joiner: joiner as unknown as SyncListener<any, SM_ON_LISTENER>,
            initCb
        });
        return this;
    }

    start(name: string): SmController<SM_ON_LISTENER, SM_ON_LISTENER> {
        if (this.started) throw new Error("can't start twice the same state machine");

        this.request.name = name;
        return new StateMachineTree().start(this);
    }
}
