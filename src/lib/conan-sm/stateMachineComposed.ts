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
        private mainStateMachineCore: StateMachineCore<MAIN_LISTENER>,
        private supportStateMachine: StateMachine<SUPPORT_LISTENER>,
        private logger: StateMachineLogger,
    ) {
        super (mainStateMachineCore)
    }



    requestStage(state: State<string, void>): void {
    }

    requestTransition(transition: SmTransition): this {
        return undefined;
    }

    runNow(toRun: [string, MAIN_LISTENER] | MAIN_LISTENER): void {
    }
}
