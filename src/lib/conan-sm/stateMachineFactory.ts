import {ParentStateMachineInfo, StateMachine, StateMachineStatus, ToProcessType} from "./stateMachine";
import {IKeyValuePairs} from "../conan-utils/typesHelper";
import {StateMachineRequest} from "./stateMachineTree";
import {StageDef} from "./stage";
import {Objects} from "../conan-utils/objects";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {SmListener, SmListenerDefLikeParser} from "./stateMachineListeners";

export class StateMachineFactory {
    static create<
        SM_ON_LISTENER extends SmListener,
        SM_IF_LISTENER extends SmListener,
        ACTIONS
    >(request: StateMachineRequest<SM_ON_LISTENER, SM_IF_LISTENER>): StateMachine<SM_ON_LISTENER, SM_IF_LISTENER, ACTIONS> {
        return this.doCreate(request);
    }


    static fork<
        SM_LISTENER extends SmListener,
        JOIN_LISTENER extends SmListener,
    >(
        parent: ParentStateMachineInfo<any, any>,
        request: StateMachineRequest<SM_LISTENER, JOIN_LISTENER>
    ) {
        return this.doCreate(request, parent);
    }

    private static doCreate<SM_LISTENER extends SmListener,
        JOIN_LISTENER extends SmListener,
        ACTIONS>(
        request: StateMachineRequest<SM_LISTENER, JOIN_LISTENER>,
        parent?: ParentStateMachineInfo<any, any>
    ): StateMachine<SM_LISTENER, JOIN_LISTENER, ACTIONS> {
        let actionsByStage: IKeyValuePairs<StageDef<string, any, any, any>> = Objects.keyfy(request.stageDefs, (it) => it.name);

        request.stateMachineListeners.push(
            new SmListenerDefLikeParser().parse([
                '::init=>doStart', {
                    onInit: ()=>{
                        stateMachine.requestTransition({
                            path: `doStart`,
                            into: {
                                name: 'start'
                            }
                        })
                    }
                } as any as SM_LISTENER
            ])
        );

        request.stateMachineListeners.push(
            new SmListenerDefLikeParser().parse(['::stop->shutdown', {
                onStop: () => {
                    StateMachineLogger.log(stateMachine.request.name, StateMachineStatus.RUNNING, stateMachine.eventThread.getCurrentStageName(), stateMachine.eventThread.getCurrentActionName(), EventType.STOP, `-`, '', []);
                    stateMachine.shutdown();
                }
            } as any as SM_LISTENER])
        );


        let stateMachine: StateMachine<SM_LISTENER, JOIN_LISTENER, ACTIONS> = new StateMachine(request, actionsByStage, parent);

        let stageStringDefs: string [] = [];
        Object.keys(stateMachine.stageDefsByKey).forEach(key => {
            let stageDef = stateMachine.stageDefsByKey[key];
            let description = `${stageDef.name}`;
            if (stageDef.deferredInfo) {
                description += `[DEFERRED]`;
            }
            stageStringDefs.push(description)
        });


        StateMachineLogger.log(request.name, StateMachineStatus.IDLE, '', '', EventType.INIT, '', 'starting SM', [
            [`listeners`, `${request.stateMachineListeners.map(it=>it.metadata).map(it => {
                return it.split(',').map(it=>`(${it})`).join(',');
            })}`],
            [`interceptors`, `${request.stateMachineInterceptors.map(it => it.metadata)}`],
            [`stage defs`, `${stageStringDefs.join(', ')}`],
        ]);


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
