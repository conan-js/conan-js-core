import {IBiConsumer, IConstructor, IConsumer, IOptSetKeyValuePairs, WithMetadata} from "../conan-utils/typesHelper";
import {StateMachineData, StateMachineTree} from "./stateMachineTree";
import {Queue} from "./queue";
import {Stage} from "./stage";
import {ListenerType, SmListener, SmListenerDefLike, SmListenerDefLikeParser} from "./stateMachineListeners";
import {SmEventsPublisher, SmController} from "./_domain";


export type SyncListener<
    INTO_SM_ON_LISTENER extends SmListener,
    JOIN_SM_ON_LISTENER extends SmListener
> = IOptSetKeyValuePairs<keyof INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>

export interface SyncStateMachineDef<
    SM_IF_LISTENER extends SmListener,
    INTO_SM_ON_LISTENER extends SmListener,
    JOIN_SM_ON_LISTENER extends SmListener,
> {
    stateMachineBuilder: StateMachineTreeBuilder<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER, any>,
    syncName: string,
    syncStartingPath?: string;
    joiner: SyncListener<INTO_SM_ON_LISTENER, SM_IF_LISTENER>,
    initCb?: IConsumer<StateMachineTreeBuilder<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER, any>>
}

export class StateMachineTreeBuilder<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    SM_ACTIONS
> implements SmEventsPublisher <SM_ON_LISTENER, SM_IF_LISTENER> {
    private readonly smListenerDefLikeParser: SmListenerDefLikeParser = new SmListenerDefLikeParser();

    public data: StateMachineData<SM_ON_LISTENER, SM_IF_LISTENER> = {
        request: {
            stateMachineListeners: [],
            stateMachineInterceptors: [],
            name: undefined,
            syncStateMachineDefs: [],
            stageDefs: [],
        }
    };
    private started: boolean = false;

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.data.request.stateMachineListeners.push(
            this.smListenerDefLikeParser.parse(listener)
        );
        return this;
    }

    addInterceptor(interceptor: [string, SM_IF_LISTENER] | SM_IF_LISTENER): this {
        throw new Error ('TBI');
    }

    withStage<
        NAME extends string,
        ACTIONS,
        REQUIREMENTS = void
    >(
        name: NAME,
        logic: IConstructor<ACTIONS, REQUIREMENTS>,
    ): this {
        this.data.request.stageDefs.push({
            name,
            logic,
        });
        return this;
    }



    withDeferredStage<
        NAME extends string,
        ACTIONS,
        REQUIREMENTS = void
    >(
        name: NAME,
        logic: IConstructor<ACTIONS, REQUIREMENTS>,
        deferrer: IBiConsumer<ACTIONS, REQUIREMENTS>,
        joinsInto: string[]
    ): this {
        this.data.request.stageDefs.push({
            name,
            logic,
            deferredInfo: {
                deferrer,
                joinsInto
            }
        });
        return this;
    }


    nextConditionally(ifStageListeners: SmListenerDefLike<SM_IF_LISTENER>): this {
        throw new Error('TBI')
    }

    sync<
        INTO_SM_ON_LISTENER extends SmListener,
        JOIN_SM_ON_LISTENER extends SmListener
    >(
        name: string,
        stateMachine: StateMachineTreeBuilder<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER, any>,
        joiner: SyncListener<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER>,
        initCb?: IConsumer<StateMachineTreeBuilder<INTO_SM_ON_LISTENER, JOIN_SM_ON_LISTENER, any>>
    ): this {
        if (this.started) throw new Error("can't modify the behaviour of a state machine once that it has started");
        this.data.request.syncStateMachineDefs.push({
            stateMachineBuilder: stateMachine,
            syncName: name,
            joiner: joiner as unknown as SyncListener<any, SM_IF_LISTENER>,
            initCb
        });
        return this;
    }

    start(name: string): SmController<SM_ON_LISTENER, SM_IF_LISTENER> {
        if (this.started) throw new Error("can't start twice the same state machine");

        this.data.request.name = name;
        return new StateMachineTree().start(this);
    }
}
