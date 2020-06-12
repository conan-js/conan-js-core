import {
    FlowRuntimeEvent,
    FlowRuntimeEventSource,
    FlowRuntimeEventTiming,
    FlowRuntimeEventType
} from "../domain/flowRuntimeEvents";
import {FlowRuntimeTracker} from "./flowRuntimeTracker";
import {IBiConsumer} from "../..";
import {LoggingOptions} from "./flowLogger";
import {FlowImpl} from "./flowImpl";


export class FlowOrchestrator {
    private pastTrackers: FlowRuntimeTracker [] = [];
    private currentTracker: FlowRuntimeTracker;

    constructor(
        private readonly eventsProcessor: IBiConsumer<FlowRuntimeEvent, LoggingOptions>[]
    ) {}


    onRuntimeEvent (
        tracker: FlowRuntimeTracker,
        event: FlowRuntimeEvent,
        loggingOptions: LoggingOptions
    ): void{
        if (event.timing === FlowRuntimeEventTiming.REQUEST_START) {
            this.currentTracker = tracker;
        } else if (event.timing === FlowRuntimeEventTiming.REQUEST_END || event.timing === FlowRuntimeEventTiming.REQUEST_CANCEL){
            this.pastTrackers.push(tracker);
            this.currentTracker = undefined;
        }

        this.eventsProcessor.forEach(it=>it(event, loggingOptions));
    }

    createRuntimeTracker(
        flowController: FlowImpl<any, any>,
        source: FlowRuntimeEventSource,
        runtimeEvent: FlowRuntimeEventType,
        payload?: any
    ): FlowRuntimeTracker {
        return new FlowRuntimeTracker(
            this,
            {
                flowController: flowController,
                source,
                runtimeEvent,
                payload
            }
        );
    }
}
