import {FlowDefFactory} from "./flowDefFactory";
import {UserFlowDef} from "../def/flow/userFlowDef";
import {FlowAnchor} from "../logic/flowAnchor";
import {Mutators, VoidMutators} from "../domain/mutators";
import {FlowOrchestrator} from "../logic/flowOrchestrator";
import {
    FlowRuntimeEvent,
    FlowRuntimeEventSource,
    FlowRuntimeEventTiming,
    FlowRuntimeEventType
} from "../domain/flowRuntimeEvents";
import {FLOW_LOGGER, LoggingOptions} from "../logic/flowLogger";
import {FlowImpl} from "../logic/flowImpl";
import {FlowFacade, FlowFacadeImpl} from "../domain/flowFacade";
import {Flow} from "../domain/flow";
import {FlowActionsDef} from "../domain/actions";
import {IBiConsumer, IFunction} from "../..";


const FlowOrchestrator$: IFunction<IBiConsumer<FlowRuntimeEvent, LoggingOptions>[], FlowOrchestrator> = (pipeline) => new FlowOrchestrator([
        (event, loggingOptions)=>FLOW_LOGGER.log(event, loggingOptions),
        ...pipeline,
]);

export class Flows {
    static create<USER_STATUSES, USER_MUTATORS extends Mutators<USER_STATUSES> = VoidMutators<USER_STATUSES>, ACTIONS = void>(
        flowDef: UserFlowDef<USER_STATUSES, USER_MUTATORS, ACTIONS>
    ): FlowFacade<USER_STATUSES, USER_MUTATORS, ACTIONS> {
        let flowController = this.createController<USER_STATUSES, USER_MUTATORS>(flowDef) as FlowImpl<USER_STATUSES, USER_MUTATORS>;
        return this.createFacade(flowController, flowDef.actions);
    }

    static createFacade<USER_STATUSES, USER_MUTATORS extends Mutators<USER_STATUSES> = VoidMutators<USER_STATUSES>, ACTIONS = void>(
        flowController: Flow<USER_STATUSES, USER_MUTATORS>,
        actionsDef?: FlowActionsDef<USER_STATUSES, USER_MUTATORS, ACTIONS>
    ): FlowFacade<USER_STATUSES, USER_MUTATORS, ACTIONS> {
        return new FlowFacadeImpl<USER_STATUSES, USER_MUTATORS, ACTIONS>(
            flowController,
            actionsDef ? actionsDef(flowController) : undefined
        );
    }

    static createController<USER_STATUSES, USER_MUTATORS extends Mutators<USER_STATUSES> = VoidMutators<USER_STATUSES>>(
        flowDef: UserFlowDef<USER_STATUSES, USER_MUTATORS>
    ): Flow<USER_STATUSES, USER_MUTATORS> {
        let flowAnchor = new FlowAnchor<USER_STATUSES, USER_MUTATORS>();

        let flowOrchestrator = FlowOrchestrator$ (flowDef.pipelineListener ? [flowDef.pipelineListener]: []);
        let flowImpl = new FlowImpl<USER_STATUSES, USER_MUTATORS>(
            FlowDefFactory.create(flowDef, flowAnchor),
            flowAnchor,
            flowOrchestrator,
        );
        let tracker = flowOrchestrator.createRuntimeTracker(
            flowImpl,
            FlowRuntimeEventSource.FLOW_FACTORY,
            FlowRuntimeEventType.CREATE_FLOW,
            flowDef
        ).trace(FlowRuntimeEventTiming.REQUEST_START);
        tracker.trace(FlowRuntimeEventTiming.REQUEST_END, flowImpl)
        return flowImpl;
    }
}
