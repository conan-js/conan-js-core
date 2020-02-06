import {IBiConsumer, IConstructor, IConsumer, IOptSetKeyValuePairs, WithMetadata} from "../conan-utils/typesHelper";
import {SmListener} from "./domain";
import {SMJoinerDef, SMListenerDef, StateMachineListenerDefs} from "./stateMachineListenerDefs";
import {StateMachine, StateMachineEndpoint} from "./stateMachine";
import {StateMachineData, StateMachineStarter} from "./stateMachineStarter";
import {Queue} from "./queue";
import {Stage} from "./stage";


export type SyncListener<INTO_SM_LISTENER, JOIN_LISTENER extends SmListener> = IOptSetKeyValuePairs<keyof INTO_SM_LISTENER, JOIN_LISTENER>

export interface SyncStateMachineDef<JOIN_LISTENER extends SmListener,
    INTO_SM_LISTENER extends SmListener,
    INTO_JOIN_LISTENER extends SmListener,
    > {
    stateMachineBuilder: StateMachineBuilder<INTO_SM_LISTENER, INTO_JOIN_LISTENER, any>,
    syncName: string,
    syncStartingPath?: string;
    joiner: SyncListener<INTO_SM_LISTENER, JOIN_LISTENER>,
    initCb?: IConsumer<StateMachineBuilder<INTO_SM_LISTENER, INTO_JOIN_LISTENER, any>>
}

export class StateMachineBuilder<
    SM_LISTENER extends SmListener,
    JOIN_LISTENER extends SmListener,
    ACTIONS,
    INITIAL_ACTIONS = ACTIONS,
> implements StateMachineEndpoint <SM_LISTENER, JOIN_LISTENER> {
    public data: StateMachineData<SM_LISTENER, JOIN_LISTENER, ACTIONS, INITIAL_ACTIONS> = {
        request: {
            nextReactionsQueue: new Queue<WithMetadata<SMListenerDef<SM_LISTENER, StateMachine<SM_LISTENER, JOIN_LISTENER>>, string>>(),
            nextConditionalReactionsQueue: new Queue<WithMetadata<SMJoinerDef<JOIN_LISTENER, StateMachine<SM_LISTENER, JOIN_LISTENER>>, string>>(),
            stateMachineListenerDefs: StateMachineListenerDefs.init(),
            startingPath: undefined,
            name: undefined,
            syncStateMachineDefs: [],
            stageDefs: [],
            nextStagesQueue: new Queue<Stage<string, any, any>>()
        }
    };
    private started: boolean = false;

    always(name: string, listener: SMListenerDef<SM_LISTENER, StateMachine<SM_LISTENER, JOIN_LISTENER>>): this {
        if (this.started) throw new Error("can't modify the behaviour of a state machine once that it has started");
        this.data.request.stateMachineListenerDefs.addWhileRunning(name, listener);
        return this;
    }

    onceAsap(name: string, requestListeners: SMListenerDef<SM_LISTENER, StateMachine<SM_LISTENER, JOIN_LISTENER>>): this {
        this.data.request.nextReactionsQueue.push({
            metadata: name,
            value: requestListeners
        });
        return this;
    }

    withStage<
        NAME extends string,
        ACTIONS,
        STAGE extends Stage<NAME, ACTIONS, REQUIREMENTS>,
        REQUIREMENTS = void>(
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
        STAGE extends Stage<NAME, ACTIONS, REQUIREMENTS>,
        REQUIREMENTS = void>(
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



    requestStage(stage: Stage<string, any, any>): this {
        this.data.request.nextStagesQueue.push(stage);
        return this;
    }

    conditionallyOnce(name: string, ifStageListeners: SMJoinerDef<JOIN_LISTENER, StateMachine<SM_LISTENER, JOIN_LISTENER>>): this {
        this.data.request.nextConditionalReactionsQueue.push({
            metadata: name,
            value: ifStageListeners
        });
        return this;
    }

    sync<INTO_SM_LISTENER extends SmListener,
        INTO_JOIN_LISTENER extends SmListener,
        >(
        name: string,
        stateMachine: StateMachineBuilder<INTO_SM_LISTENER, INTO_JOIN_LISTENER, any>,
        joiner: SyncListener<INTO_SM_LISTENER, JOIN_LISTENER>,
        initCb?: IConsumer<StateMachineBuilder<INTO_SM_LISTENER, INTO_JOIN_LISTENER, any>>
    ): this {
        if (this.started) throw new Error("can't modify the behaviour of a state machine once that it has started");
        this.data.request.syncStateMachineDefs.push({
            stateMachineBuilder: stateMachine,
            syncName: name,
            joiner: joiner as SyncListener<any, JOIN_LISTENER>,
            initCb
        });
        return this;
    }

    start(name: string, startingPath?: string): StateMachine<SM_LISTENER, JOIN_LISTENER> {
        if (this.started) throw new Error("can't start twice the same state machine");

        this.data.request.name = name;
        this.data.request.startingPath = startingPath;
        return new StateMachineStarter().start(this);
    }
}
