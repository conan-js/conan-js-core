import {FlowRuntimeEvent, FlowRuntimeEventTiming} from "../domain/flowRuntimeEvents";
import {IPartial} from "../..";
import {FlowOrchestrator} from "./flowOrchestrator";
import {LoggingOptions} from "./flowLogger";

export class FlowRuntimeTracker {

    constructor(
        private readonly orchestrator: FlowOrchestrator,
        private readonly event: IPartial<FlowRuntimeEvent>
    ) {}

    trace (
        timing: FlowRuntimeEventTiming,
        shortDesc?: any,
        payload?: any
    ): FlowRuntimeTracker {
        return this.doTick(timing, shortDesc, payload, {
            highlight: false
        });
    }

    highlight (
        timing: FlowRuntimeEventTiming,
        shortDesc?: any,
        payload?: any
    ): FlowRuntimeTracker {
        return this.doTick(timing, shortDesc, payload, {
            highlight: true
        });
    }

    private doTick(
        timing: FlowRuntimeEventTiming,
        shortDesc: any,
        payload: any,
        loggingOptions: LoggingOptions
    ) {
        let event: FlowRuntimeEvent = {
            ...this.event,
            shortDesc,
            timing,
            ...(payload ? {payload}: undefined)
        } as FlowRuntimeEvent;
        this.orchestrator.onRuntimeEvent(this, event, loggingOptions);
        return this;
    }
}
