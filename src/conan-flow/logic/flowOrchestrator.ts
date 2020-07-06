import {FlowEvent, FlowEventSource, FlowEventType} from "../domain/flowRuntimeEvents";
import {FlowRuntimeTracker} from "./flowRuntimeTracker";
import {IConsumer} from "../..";
import {FlowImpl} from "./flowImpl";


export class FlowOrchestrator {

    constructor(
        private readonly eventsProcessor: IConsumer<FlowEvent>[]
    ) {}


    onRuntimeEvent (
        tracker: FlowRuntimeTracker,
        event: FlowEvent,
    ): void{
        this.eventsProcessor.forEach(it=>it(event));
    }

    createRuntimeTracker(
        flowController: FlowImpl<any, any>,
        source: FlowEventSource,
        runtimeEvent: FlowEventType,
        payload?: any
    ): FlowRuntimeTracker {
        return new FlowRuntimeTracker(
            this,
            {
                flowController: flowController,
                source,
                type: runtimeEvent,
                payload,
                nature: flowController.flowDef.nature
            }
        );
    }
}
