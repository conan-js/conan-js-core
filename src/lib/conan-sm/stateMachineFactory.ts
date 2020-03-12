import {ParentStateMachineInfo, StateMachineImpl, StateMachineStatus, ToProcessType} from "./stateMachineImpl";
import {IConsumer, IKeyValuePairs} from "../conan-utils/typesHelper";
import {Stage, StageDef} from "./stage";
import {Objects} from "../conan-utils/objects";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {
    ListenerType,
    SmEventCallbackParams,
    SmListener,
    SmListenerDefLikeParser,
    SmListenerDefList
} from "./stateMachineListeners";
import {StateMachineTreeBuilderData} from "./_domain";
import {Strings} from "../conan-utils/strings";

export class StateMachineFactory {
    static create<
        SM_ON_LISTENER extends SmListener,
        SM_IF_LISTENER extends SmListener,
        ACTIONS
    >(request: StateMachineTreeBuilderData<SM_ON_LISTENER, SM_IF_LISTENER>): StateMachineImpl<SM_ON_LISTENER, SM_IF_LISTENER, ACTIONS> {
        return this.doCreate(request);
    }


    static fork<
        SM_LISTENER extends SmListener,
        JOIN_LISTENER extends SmListener,
    >(
        forkName: string,
        parent: ParentStateMachineInfo<any, any>,
        forkIntoStage: Stage,
        forkIntoStageDef: StageDef<any, any, any>,
        defer: IConsumer<any>
    ) {
        let deferEventName = Strings.camelCaseWithPrefix('on', forkIntoStage.stateName);
        let deferPathName = Strings.camelCaseWithPrefix('do', forkIntoStage.stateName);

        return this.doCreate({
            initialListener: {
                metadata: {
                    name: `::start=>${deferPathName}`,
                    executionType: ListenerType.ONCE,
                },
                value: {
                    onStart: (_: any, params: SmEventCallbackParams) => params.sm.requestTransition({
                        transitionName: deferPathName,
                        transition: forkIntoStage,
                        payload: forkIntoStage.data
                    })
                }
            },
            name: forkName,
            stageDefs: [{
                name: forkIntoStage.stateName,
                logic: forkIntoStageDef.logic
            }],
            listeners: [{
                metadata: {
                    name: `::${deferEventName}->[DEFERRED]`,
                    executionType: ListenerType.ALWAYS
                },
                value: {
                    [deferEventName]: (actions: any) => defer(actions)
                }
            }],
            interceptors: [],
            syncDefs: undefined,
        }, parent);
    }

    private static doCreate<
        SM_LISTENER extends SmListener,
        JOIN_LISTENER extends SmListener,
        ACTIONS
    >(
        treeBuilderData: StateMachineTreeBuilderData<SM_LISTENER, JOIN_LISTENER>,
        parent?: ParentStateMachineInfo<any, any>
    ): StateMachineImpl<SM_LISTENER, JOIN_LISTENER, ACTIONS> {
        let stageDefsByKey: IKeyValuePairs<StageDef<string, any, any, any>> = Objects.keyfy(treeBuilderData.stageDefs, (it) => it.name);
        let systemStages: IKeyValuePairs<StageDef<string, any, any, any>>;
        let systemListeners: SmListenerDefList<SM_LISTENER> = [];
        let externalListeners: SmListenerDefList<SM_LISTENER> = treeBuilderData.listeners;

        systemStages = {
            init: {
                name: 'init',
                logic: undefined
            },
            start: {
                name: 'start',
                logic: undefined
            },
            stop: {
                name: 'stop',
                logic: undefined
            }
        };

        systemListeners.push(
            new SmListenerDefLikeParser().parse([
                '::init=>doStart', {
                    onInit: ()=>{
                        stateMachine.requestTransition({
                            transitionName: `doStart`,
                            transition: {
                                stateName: 'start'
                            }
                        })
                    }
                } as any as SM_LISTENER
            ], ListenerType.ONCE)
        );

        systemListeners.push(
            new SmListenerDefLikeParser().parse(['::stop->shutdown', {
                onStop: () => {
                    stateMachine.shutdown();
                }
            } as any as SM_LISTENER], ListenerType.ONCE)
        );

        let stageStringDefs: string [] = [];
        Object.keys(stageDefsByKey).forEach(key => {
            let stageDef = stageDefsByKey[key];
            let description = `${stageDef.name}`;
            if (stageDef.deferredInfo) {
                description += `[DEFERRED]`;
            }
            stageStringDefs.push(description)
        });

        StateMachineLogger.log(treeBuilderData.name, StateMachineStatus.IDLE, '', '', EventType.INIT, undefined, '', [
            [`init listeners`, treeBuilderData.initialListener ? `(${treeBuilderData.initialListener.metadata})` : undefined],
            [`listeners`, `${externalListeners.map(it=>it.metadata).map(it => {
                return it.name.split(',').map(it=>`(${it})`).join(',');
            })}`],
            [`system listeners`, `${systemListeners.map(it=>it.metadata).map(it => {
                return it.name.split(',').map(it=>`(${it})`).join(',');
            })}`],
            [`interceptors`, `${treeBuilderData.interceptors.map(it => it.metadata)}`],
            [`stages`, `${stageStringDefs.join(', ')}`],
            [`system stages`, 'init, start, stop'],
        ]);

        let stateMachine: StateMachineImpl<SM_LISTENER, JOIN_LISTENER, ACTIONS> = new StateMachineImpl({
            ...treeBuilderData,
            listeners: [...treeBuilderData.listeners, ...systemListeners, ...treeBuilderData.initialListener ? [treeBuilderData.initialListener] : []],
            stageDefsByKey: {...systemStages, ...stageDefsByKey},
            parent,
        });



        stateMachine.requestStage ({
            description: '::init',
            eventType: EventType.INIT,
            stage: {
                stateName: 'init'
            },
            type: ToProcessType.STAGE
        });


        return stateMachine;

    }

}
