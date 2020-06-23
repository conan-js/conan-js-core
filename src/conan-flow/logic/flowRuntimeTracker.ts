import {FlowEvent, FlowEventTiming, FlowEventLevel} from "../domain/flowRuntimeEvents";
import {IPartial} from "../..";
import {FlowOrchestrator} from "./flowOrchestrator";

export class FlowRuntimeTracker {

    constructor(
        private readonly orchestrator: FlowOrchestrator,
        private readonly event: IPartial<FlowEvent>
    ) {}

    end (
        shortDesc?: any,
        payload?: any
    ): FlowRuntimeTracker {
        return this.doTick(FlowEventLevel.TRACE, FlowEventTiming.END, shortDesc, payload);
    }

    cancel (
        shortDesc?: any,
        payload?: any
    ): FlowRuntimeTracker {
        return this.doTick(FlowEventLevel.TRACE, FlowEventTiming.CANCEL, shortDesc, payload);
    }


    start (
        shortDesc?: any,
        payload?: any
    ): FlowRuntimeTracker {
        return this.doTick(FlowEventLevel.TRACE, FlowEventTiming.START, shortDesc, payload);

    }

    debug (
        shortDesc?: any,
        payload?: any
    ): FlowRuntimeTracker {
        return this.doTick(FlowEventLevel.DEBUG, FlowEventTiming.IN_PROCESS, shortDesc, payload);
    }

    info (
        shortDesc?: any,
        payload?: any
    ): FlowRuntimeTracker {
        return this.doTick(FlowEventLevel.INFO, FlowEventTiming.IN_PROCESS, shortDesc, payload);
    }


    milestone (
        shortDesc?: any,
        payload?: any
    ): FlowRuntimeTracker {
        return this.doTick(FlowEventLevel.MILESTONE, FlowEventTiming.IN_PROCESS, shortDesc, payload);
    }

    withLevel (
        level: FlowEventLevel,
        shortDesc?: any,
        payload?: any
    ): FlowRuntimeTracker {
        return this.doTick(level, FlowEventTiming.IN_PROCESS, shortDesc, payload);
    }


    private doTick(
        level: FlowEventLevel,
        timing: FlowEventTiming,
        shortDesc: any,
        payload: any,
    ) {
        let event: FlowEvent = {
            ...this.event,
            shortDesc,
            timing,
            level,
            ...(payload!=null ? {payload}: undefined)
        } as FlowEvent;
        this.orchestrator.onRuntimeEvent(this, event);
        return this;
    }
}
