import {ParentStateMachineInfo, StateMachine, ToProcessType} from "./stateMachine";
import {IKeyValuePairs} from "../conan-utils/typesHelper";
import {StateMachineData} from "./stateMachineTree";
import {StageDef} from "./stage";
import {Objects} from "../conan-utils/objects";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {ListenerType, SmListener} from "./stateMachineListeners";

export class StateMachineFactory {
    static create<SM_ON_LISTENER extends SmListener,
        SM_IF_LISTENER extends SmListener,
        ACTIONS>(data: StateMachineData<SM_ON_LISTENER, SM_IF_LISTENER>): StateMachine<SM_ON_LISTENER, SM_IF_LISTENER, ACTIONS> {
        return this.doCreate(data);
    }


    static fork<SM_LISTENER extends SmListener,
        JOIN_LISTENER extends SmListener,
        >(parent: ParentStateMachineInfo<any, any>, data: StateMachineData<SM_LISTENER, JOIN_LISTENER>) {
        return this.doCreate(data, parent);
    }

    private static doCreate<SM_LISTENER extends SmListener,
        JOIN_LISTENER extends SmListener,
        ACTIONS>(
        data: StateMachineData<SM_LISTENER, JOIN_LISTENER>,
        parent?: ParentStateMachineInfo<any, any>
    ): StateMachine<SM_LISTENER, JOIN_LISTENER, ACTIONS> {
        let actionsByStage: IKeyValuePairs<StageDef<string, any, any, any>> = Objects.keyfy(data.request.stageDefs, (it) => it.name);
        let stateMachine: StateMachine<SM_LISTENER, JOIN_LISTENER, ACTIONS> = new StateMachine(data, actionsByStage, parent);

        let stageStringDefs: string [] = [];
        Object.keys(stateMachine.stageDefsByKey).forEach(key => {
            let stageDef = stateMachine.stageDefsByKey[key];
            let description = `${stageDef.name}`;
            if (stageDef.deferredInfo) {
                description += `[DEFERRED]`;
            }
            stageStringDefs.push(description)
        });


        StateMachineLogger.log(data.request.name, '', EventType.INIT, `starting SM `, [
            [`listeners`, `${data.request.stateMachineListeners.map(it=>it.metadata).map(it => {
                return it.split(',').map(it=>`(${it})`).join(',');
            })}`],
            [`interceptors`, `${data.request.stateMachineInterceptors.map(it => it.metadata)}`],
            [`stage defs`, `${stageStringDefs.join(', ')}`],
        ]);


        stateMachine.addListener(['::init=>doStart', {
            onInit: ()=>{
                stateMachine.requestTransition({
                    path: `doStart`,
                    into: {
                        name: 'start'
                    }
                })
            }
        } as any as SM_LISTENER], ListenerType.ONCE);

        stateMachine.addListener(['::stop=>doShutdown', {
            onStop: () => {
                StateMachineLogger.log(stateMachine.data.request.name, stateMachine.eventThread.getCurrentStageName(), EventType.STOP, ``, []);
                stateMachine.shutdown();
            }
        } as any as SM_LISTENER], ListenerType.ONCE);

        stateMachine.requestStage ({
            description: '::init',
            eventType: EventType.INIT,
            stage: {
                name: 'init'
            },
            type: ToProcessType.STAGE
        });


        return stateMachine;

    }

}
