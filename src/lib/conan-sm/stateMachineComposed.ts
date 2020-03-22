import {StateMachine, StateMachineCore} from "./stateMachine";
import {ListenerType, OnEventCallback, SmListener} from "./stateMachineListeners";
import {WithMetadataArray} from "../conan-utils/typesHelper";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {State, StateDef} from "./state";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {ListenerDefType, ListenerMetadata} from "./stateMachineCore";
import {StateMachineBase} from "./stateMachineBase";

export class StateMachineComposed<
    MAIN_LISTENER extends SmListener,
    SUPPORT_LISTENER extends SmListener
> extends StateMachineBase<MAIN_LISTENER>{
    constructor(
        private mainStateMachine: StateMachine<MAIN_LISTENER>,
        private supportStateMachine: StateMachine<SUPPORT_LISTENER>,
    ) {
        super (mainStateMachine)
    }



    requestStage(state: State): void {
        this.mainStateMachine.requestStage(state);
    }

    requestTransition(transition: SmTransition): this {
        this.mainStateMachine.requestTransition(transition);
        return this;
    }

    runNow(toRun: [string, MAIN_LISTENER] | MAIN_LISTENER): void {
        throw new Error('TBI');
    }
}
