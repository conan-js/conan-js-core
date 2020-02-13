import {ParentStateMachineInfo, StateMachineImpl} from "./stateMachine";
import {IKeyValuePairs} from "../conan-utils/typesHelper";
import {StateMachineData} from "./stateMachineTree";
import {StageDef} from "./stage";
import {Objects} from "../conan-utils/objects";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {ListenerType, SmListener} from "./stateMachineListeners";

export class StateMachineFactory {
    static create<
        SM_ON_LISTENER extends SmListener,
        SM_IF_LISTENER extends SmListener,
        ACTIONS
    >(data: StateMachineData<SM_ON_LISTENER, SM_IF_LISTENER>): StateMachineImpl<SM_ON_LISTENER, SM_IF_LISTENER, ACTIONS> {
        return this.doCreate(data);
    }


    static fork<SM_LISTENER extends SmListener,
        JOIN_LISTENER extends SmListener,
        >(parent: ParentStateMachineInfo<any, any>, data: StateMachineData<SM_LISTENER, JOIN_LISTENER>) {
        return this.doCreate(data, parent);
    }

    private static doCreate<
        SM_LISTENER extends SmListener,
        JOIN_LISTENER extends SmListener,
        ACTIONS
    >(
        data: StateMachineData<SM_LISTENER, JOIN_LISTENER>,
        parent?: ParentStateMachineInfo<any, any>
    ): StateMachineImpl<SM_LISTENER, JOIN_LISTENER, ACTIONS> {
        let actionsByStage: IKeyValuePairs<StageDef<string, any, any, any>> = Objects.keyfy(data.request.stageDefs, (it) => it.name);
        let stateMachine: StateMachineImpl<SM_LISTENER, JOIN_LISTENER, ACTIONS> = new StateMachineImpl(data, actionsByStage, parent);

        let initialStages = data.request.nextStagesQueue.read();
        let stageStringDefs: string [] = [];
        Object.keys(stateMachine.stageDefsByKey).forEach(key => {
            let stageDef = stateMachine.stageDefsByKey[key];
            let description = `${stageDef.name}`;
            if (stageDef.deferredInfo) {
                description += ` (deferred)`;
            }
            stageStringDefs.push(description)
        });

        stateMachine.addListener(ListenerType.ONCE, ['stop=>shutdown', {
            onStop: () => {
                StateMachineLogger.log(stateMachine.data.request.name, stateMachine.eventThread.currentEvent.stageName, EventType.STOP, ``, '', []);
                stateMachine.shutdown();
            }
        } as any as SM_LISTENER]);


        StateMachineLogger.log(data.request.name, '', EventType.INIT, `starting SM: `, undefined, [
            [`listeners`, `${data.request.stateMachineListeners.map(it => it.metadata)}`],
            [`asap`, `${data.request.nextReactionsQueue.read().map(it => it.metadata)}`],
            [`stage defs`, `${stageStringDefs.join(', ')}`],
            [`on init`, `${initialStages.map(it => it.name).join(', ')}`],
        ]);

        initialStages.forEach(it => {
            stateMachine.requestStage(it);

        });

        return stateMachine;

    }

}
