import {SmListener, SmListenerDefLike, SmListenerDefLikeParser} from "../events/stateMachineListeners";
import {SmEventsPublisher} from "../_domain";
import {ReactionType} from "../reactions/reactor";
import {Strings} from "../../conan-utils/strings";
import {StateDef} from "./stateDef";
import {ReactionParser} from "../reactions/reactionParser";
import {AsapLike} from "../../conan-utils/asap";
import {State} from "./state";
import {IConsumer, IFunction, IProducer} from "../../conan-utils/typesHelper";
import {StateMachineDef} from "../stateMachineDef";


export interface StateMachineEndpoint<
    SM_ON_LISTENER extends SmListener,
    STARTER = AsapLike<State<any>>
> extends SmEventsPublisher <SM_ON_LISTENER, SM_ON_LISTENER> {
    withState<
        PATHS,
        DATA = void
    > (
        stateDef: StateDef<PATHS, DATA>
    ): this;

    withStarter (mapper:IFunction<STARTER, AsapLike<State<any>>>): this;

    if (condition: IProducer<boolean>, ifTrue: IFunction<this, this>): this;
}

export class StateMachineDefBuilder<
    SM_ON_LISTENER extends SmListener,
    STARTER = AsapLike<State<any>>
> implements StateMachineEndpoint<SM_ON_LISTENER, STARTER> {
    private readonly smListenerDefLikeParser: SmListenerDefLikeParser = new SmListenerDefLikeParser();

    public stateMachineDef: StateMachineDef<SM_ON_LISTENER, STARTER> = {
        rootDef:{
            listeners: [],
            interceptors: [],
            name: undefined,
            stageDefsByKey: {},
        }
    };

    constructor(base?: StateMachineDef<SM_ON_LISTENER, STARTER>) {
        if (base) {
            this.stateMachineDef = {
                rootDef: {
                    listeners: base.rootDef.listeners.map(it => ({...it})),
                    interceptors: base.rootDef.interceptors.map(it => ({...it})),
                    name: base.rootDef.name,
                    stageDefsByKey: {...base.rootDef.stageDefsByKey}
                },
                mapper: base.mapper
            }
        }
    }

    addInterceptor(interceptor: SmListenerDefLike<SM_ON_LISTENER>, type: ReactionType = ReactionType.ALWAYS): this {
        this.stateMachineDef.rootDef.interceptors.push(
            this.smListenerDefLikeParser.parse(interceptor, type)
        );
        return this;
    }

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ReactionType = ReactionType.ALWAYS): this {
        this.stateMachineDef.rootDef.listeners.push(
            this.smListenerDefLikeParser.parse(listener, type)
        );
        return this;
    }



    withState<
        ACTIONS,
        DATA = void
    >(stateDef: StateDef<ACTIONS, DATA>): this {
        if (this.stateMachineDef.rootDef.stageDefsByKey [stateDef.name]) {
            return this;
        }
        this.stateMachineDef.rootDef.stageDefsByKey [stateDef.name] = stateDef;
        if (stateDef.reactions && stateDef.reactions.length === 1) {
            let eventName = Strings.camelCaseWithPrefix('on', stateDef.name);
            this.addListener([`${stateDef.reactions[0].metadata.name}`, {
                [eventName]: stateDef.reactions[0].value
            } as any]);
        }

        if (stateDef.logic) {
            this.addInterceptor(ReactionParser.parse(stateDef.logic));
        }
        return this;
    }


    withName(name: string): this {
        this.stateMachineDef.rootDef.name = name;
        return this;
    }

    build(): StateMachineDef<SM_ON_LISTENER, STARTER> {
        return this.stateMachineDef;
    }

    withStarter(mapper: IFunction<STARTER, AsapLike<State<any>>>): this {
        this.stateMachineDef.mapper = mapper;
        return this;
    }

    if(condition: IProducer<boolean>, ifTrue: IFunction<this, this>): this {
        let resultCondition = condition();
        return !resultCondition ? this : ifTrue(this);
    }
}
