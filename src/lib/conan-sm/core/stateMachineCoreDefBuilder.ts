import {IBiConsumer, IConstructor, IConsumer} from "../../conan-utils/typesHelper";
import {ListenerType, SmListener, SmListenerDefLike, SmListenerDefLikeParser} from "../stateMachineListeners";
import {SmEventsPublisher} from "../_domain";
import {State, StateDef, StateLogic} from "../state";
import {StateMachineCoreDef} from "./stateMachineCoreDef";


export interface StateMachineBuilderEndpoint<
    SM_ON_LISTENER extends SmListener,
> extends SmEventsPublisher <SM_ON_LISTENER, SM_ON_LISTENER> {
    withState<ACTIONS,
        DATA = void>
    (
        stateName: string,
        logic: StateLogic<ACTIONS, DATA>,
    ): this;

    withDeferredState<NAME extends string,
        ACTIONS,
        REQUIREMENTS = void>(
        name: NAME,
        logic: IConstructor<ACTIONS, REQUIREMENTS>,
        deferrer: IBiConsumer<ACTIONS, REQUIREMENTS>,
        joinsInto: string[]
    ): this;
}

export class StateMachineCoreDefBuilder<
    SM_ON_LISTENER extends SmListener,
> implements StateMachineBuilderEndpoint<SM_ON_LISTENER> {
    private readonly smListenerDefLikeParser: SmListenerDefLikeParser = new SmListenerDefLikeParser();

    public stateMachineCoreDef: StateMachineCoreDef<SM_ON_LISTENER> = {
            listeners: [],
            interceptors: [],
            name: undefined,
            stageDefsByKey: {},
    };

    constructor(base?: StateMachineCoreDef<SM_ON_LISTENER>) {
        if (base) {
            this.stateMachineCoreDef = {
                listeners: base.listeners.map(it=>({...it})),
                interceptors: base.interceptors.map(it=>({...it})),
                name: base.name,
                stageDefsByKey: {...base.stageDefsByKey},
            }
        }
    }

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.stateMachineCoreDef.listeners.push(
            this.smListenerDefLikeParser.parse(listener, type)
        );
        return this;
    }

    addInterceptor(interceptor: SmListenerDefLike<SM_ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        throw new Error('TBI');
    }

    withInitialState<DATA = void>(
        stateName: string,
        data?: DATA,
    ): this {
        this.withState<any>('start', () => ({
            doInitialise: (initialData: DATA): State<any, DATA> => ({
                name: stateName,
                ...initialData ? {data: initialData} : undefined
            })
        }))
            .addListener([`::start=>doInitialise`, {
                onStart: (actions: any) => actions.doInitialise(data)
            } as any,], ListenerType.ONCE);
        return this;
    }

    withDeferredStart<
        ACTIONS,
        DATA>
    (
        joinsInto: string,
        actionsProvider: IConstructor<ACTIONS, DATA>,
        deferrer: IConsumer<ACTIONS>
    ): this {
        // [`onStart=>initializing`, {
        //     onStart: (_: any, params: any) => params.sm.requestTransition({
        //         transition: {
        //             stateName: 'initializing'
        //         },
        //         transitionName: 'doInitializing'
        //     } as any)
        // }]
        return this.withDeferredState<'start',
            ACTIONS,
            DATA>(
            'start',
            actionsProvider,
            deferrer,
            [joinsInto]
        );
    }


    withState<
        ACTIONS,
        DATA = void
    >(
        stateName: string,
        logic: StateLogic<ACTIONS, DATA>,
    ): this {
        if (this.stateMachineCoreDef.stageDefsByKey [stateName]) {
            return this;
        }
        this.stateMachineCoreDef.stageDefsByKey [stateName] = {
            logic: logic,
            name: stateName
        } as StateDef<any, any, any>;
        return this;
    }


    withDeferredState<NAME extends string,
        ACTIONS,
        REQUIREMENTS = void>
    (
        name: NAME,
        logic: StateLogic<ACTIONS, REQUIREMENTS>,
        deferrer: IBiConsumer<ACTIONS, REQUIREMENTS>,
        joinsInto: string[]
    ): this {
        this.stateMachineCoreDef.stageDefsByKey[name] = {
            name: name,
            logic: logic,
            deferredInfo: {
                deferrer: deferrer,
                joinsInto: joinsInto
            }
        } as StateDef<NAME, ACTIONS, any, REQUIREMENTS>;
        return this;
    }

    withName(name: string): this {
        this.stateMachineCoreDef.name = name;
        return this;
    }

    build(): StateMachineCoreDef<SM_ON_LISTENER> {
        return this.stateMachineCoreDef;
    }
}
