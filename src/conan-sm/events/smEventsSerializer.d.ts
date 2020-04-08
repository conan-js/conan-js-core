import { SerializedSmEvent } from "./stateMachineEvents";
import { StateMachine } from "../stateMachine";
import { ForkStateMachineListener } from "../prototypes/forkStateMachine";
import { SmEventThread } from "./smEventThread";
export interface SmEventsSerializer {
    serialize(mainEventThread: SmEventThread): SerializedSmEvent[];
}
export declare abstract class SmEventsSerializerFactory {
    static forkSerializer(forkSm: StateMachine<ForkStateMachineListener>): SmEventsSerializer;
    static simpleSerializer(): SmEventsSerializer;
}
