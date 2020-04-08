import {SerializedSmEvent} from "./stateMachineEvents";
import {StateMachine} from "../stateMachine";
import {ForkStateMachineListener} from "../prototypes/forkStateMachine";
import {SmEventThread} from "./smEventThread";

export interface SmEventsSerializer {
    serialize (mainEventThread: SmEventThread): SerializedSmEvent[];
}

export abstract class SmEventsSerializerFactory {
    static forkSerializer (forkSm: StateMachine<ForkStateMachineListener>): SmEventsSerializer {
        return {
            serialize(mainEventThread: SmEventThread): SerializedSmEvent[] {
                return mainEventThread.serialize();
            }
        };
    }

    static simpleSerializer (): SmEventsSerializer {
        return {
            serialize(mainEventThread: SmEventThread): SerializedSmEvent[] {
                return mainEventThread.serialize();
            }
        };

    }
}
