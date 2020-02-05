import {ParentStateMachineInfo, StateMachineImpl} from "./stateMachine";
import {SmListener} from "./domain";
import {EventThread} from "./eventThread";
import {IKeyValuePairs} from "../conan-utils/typesHelper";
import {StateMachineData} from "./stateMachineStarter";
import {StageDef} from "./stage";
import {Objects} from "../conan-utils/objects";

export class StateMachineFactory {
    static create<
        SM_LISTENER extends SmListener,
        JOIN_LISTENER extends SmListener,
        ACTIONS
    > (data: StateMachineData<SM_LISTENER, JOIN_LISTENER, ACTIONS>): StateMachineImpl <SM_LISTENER, JOIN_LISTENER, ACTIONS> {
        return this.doCreate(data);
    }


    static fork<
        SM_LISTENER extends SmListener,
        JOIN_LISTENER extends SmListener,
        ACTIONS
    > (parent: ParentStateMachineInfo<any, any>, data: StateMachineData<SM_LISTENER, JOIN_LISTENER, ACTIONS>) {
        return this.doCreate(data, parent);
    }

    private static doCreate<
        SM_LISTENER extends SmListener,
        JOIN_LISTENER extends SmListener,
        ACTIONS
    > (data: StateMachineData<SM_LISTENER, JOIN_LISTENER, ACTIONS>, parent?: ParentStateMachineInfo<any, any>): StateMachineImpl <SM_LISTENER, JOIN_LISTENER, ACTIONS> {
        let actionsByStage: IKeyValuePairs<StageDef<string, any, any, any>> = Objects.keyfy(data.request.stageDefs, (it)=>it.name);
        let stateMachine: StateMachineImpl<SM_LISTENER, JOIN_LISTENER, ACTIONS> = new StateMachineImpl(data, actionsByStage, parent);

        let eventThread = new EventThread(data.request.name, (params)=>{
            stateMachine.publishEvent(params.eventThread, params.event);
        });


        stateMachine.init(
            eventThread,
            data.request.stateMachineListenerDefs.asListenersByType(stateMachine)
        );



        return stateMachine;

    }

}
