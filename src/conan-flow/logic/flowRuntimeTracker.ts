import {FlowEvent, FlowEventTiming, FlowEventLevel, FlowEventType} from "../domain/flowRuntimeEvents";
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

    continue (
        shortDesc?: any,
        payload?: any
    ): FlowRuntimeTracker {
        return this.doTick(FlowEventLevel.TRACE, FlowEventTiming.CONTINUE, shortDesc, payload);
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

    fork (
        type: FlowEventType,
        level: FlowEventLevel,
        shortDesc?: any,
        payload?: any
    ): void {
        let forkedTracker = this.orchestrator.createRuntimeTracker(
            this.event.flowController,
            this.event.source,
            type,
            payload
        ).start();
        forkedTracker.withLevel(level, shortDesc, payload);
        forkedTracker.end();
    }



    private doTick(
        level: FlowEventLevel,
        timing: FlowEventTiming,
        shortDesc: any,
        payload: any,
        type?: FlowEventType
    ) {
        let event: FlowEvent = {
            ...this.event,
            ...(type!=null ? {type}: undefined),
            shortDesc,
            timing,
            level,
            ...(payload!=null ? {payload}: undefined)
        } as FlowEvent;
        this.orchestrator.onRuntimeEvent(this, event);
        return this;
    }
}
