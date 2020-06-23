import {
    FlowEvent,
    FlowEventNature, FlowEventSource,
    FlowEventTiming,
    FlowEventType
} from "../domain/flowRuntimeEvents";
import {FlowRuntimeTracker} from "./flowRuntimeTracker";
import {IConsumer} from "../..";
import {FlowImpl} from "./flowImpl";


export class FlowOrchestrator {
    private currentTracker: FlowRuntimeTracker;

    constructor(
        private readonly eventsProcessor: IConsumer<FlowEvent>[]
    ) {}


    onRuntimeEvent (
        tracker: FlowRuntimeTracker,
        event: FlowEvent,
    ): void{
        if (event.timing === FlowEventTiming.START) {
            this.currentTracker = tracker;
        } else if (event.timing === FlowEventTiming.END || event.timing === FlowEventTiming.CANCEL){
            this.currentTracker = undefined;
        }

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
                runtimeEvent,
                payload,
                nature: flowController.flowDef.nature
            }
        );
    }
}
