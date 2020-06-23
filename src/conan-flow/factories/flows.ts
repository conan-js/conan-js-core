import {FlowDefFactory} from "./flowDefFactory";
import {UserFlowDef} from "../def/flow/userFlowDef";
import {FlowAnchor} from "../logic/flowAnchor";
import {Mutators, VoidMutators} from "../domain/mutators";
import {FlowOrchestrator} from "../logic/flowOrchestrator";
import {FlowEvent, FlowEventNature, FlowEventSource, FlowEventType} from "../domain/flowRuntimeEvents";
import {FLOW_LOGGER} from "../logic/flowLogger";
import {FlowImpl} from "../logic/flowImpl";
import {FlowFacade, FlowFacadeImpl} from "../domain/flowFacade";
import {Flow} from "../domain/flow";
import {FlowActionsDef} from "../domain/actions";
import {IConsumer, IFunction} from "../..";


const FlowOrchestrator$: IFunction<IConsumer<FlowEvent>[], FlowOrchestrator> = (pipeline) => new FlowOrchestrator([
        (event)=>FLOW_LOGGER.log(event),
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
            FlowEventSource.FLOW_FACTORY,
            FlowEventType.CREATING,
            flowDef
        ).start();
        tracker.end();
        return flowImpl;
    }
}
