import {Status, StatusLike, StatusLikeParser} from "../domain/status";
import {FlowRequest, StatusRequest} from "./flowRequest";
import {ICallback, IConsumer, IKeyValuePairs} from "../../index";
import {Transition} from "../domain/transitions";
import {Context} from "../domain/context";
import {ReactionDef} from "../def/reactionDef";
import {Mutators, VoidMutators} from "../domain/mutators";
import {FlowRuntimeTracker} from "./flowRuntimeTracker";
import {FlowOrchestrator} from "./flowOrchestrator";
import {FlowRuntimeEventSource, FlowRuntimeEventTiming, FlowRuntimeEventType} from "../domain/flowRuntimeEvents";
import {FlowImpl} from "./flowImpl";
import {FlowEventsTracker} from "./flowEventsTracker";

export interface OnContextProxyParams {
    statusName: string;
    methodName: string;
    payload: any;
    result: any;
}

export class FlowThread<
    STATUSES,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
> {
    private ids: IKeyValuePairs<number> = {};
    public currentRequest: FlowRequest;

    constructor(
        readonly flowController: FlowImpl<STATUSES, MUTATORS>,
        private readonly flowOrchestrator: FlowOrchestrator,
        private readonly flowEvents: FlowEventsTracker<STATUSES>
    ) {}

    requestStatus(statusLike: StatusLike, isStep: boolean): void {
        let status = StatusLikeParser.parse(statusLike);
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this.flowController,
            FlowRuntimeEventSource.FLOW_THREAD,
            FlowRuntimeEventType.REQUEST_STATUS,
            statusLike
        ).highlight(FlowRuntimeEventTiming.REQUEST_START, `${status.name}`);
        this.assertValidStatus(status.name);
        if (this.currentRequest != null) {
            if (!isStep) {
                tracker.trace(FlowRuntimeEventTiming.TRACE, `queueing status [${status.name}]`)
                this.currentRequest.queueStatus(status);
            } else {
                tracker.trace(FlowRuntimeEventTiming.TRACE, `queueing state [${status.name}]`)
                this.currentRequest.queueState(status);
            }
            return;
        }

        let id = this.getNextId(status);
        this.currentRequest = FlowRequest.statusRequest(this as any, id + '', status, isStep);
        this.currentRequest.start();
        tracker.trace(FlowRuntimeEventTiming.REQUEST_END)
    }

    requestTransition(transition: Transition, isStep: boolean): this {
        let intoStatusName = StatusLikeParser.parse(transition.into).name;
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this.flowController,
            FlowRuntimeEventSource.FLOW_THREAD,
            FlowRuntimeEventType.REQUEST_TRANSITION,
            transition
        ).highlight(FlowRuntimeEventTiming.REQUEST_START, `${transition.transitionName}`);
        tracker.highlight(FlowRuntimeEventTiming.INFO, isStep ? 'step' : 'Transition', transition.transitionName)
        this.assertValidStatus(intoStatusName);

        if (this.currentRequest != null) {
            if (!isStep) {
                tracker.trace(FlowRuntimeEventTiming.TRACE, `queueing transition [${transition.transitionName}]`)
                this.currentRequest.queueTransition(transition);
            } else {
                tracker.trace(FlowRuntimeEventTiming.TRACE, `queueing step [${transition.transitionName}]`)
                this.currentRequest.queueStep(transition);
            }
            return;
        }

        let id = this.getNextId(StatusLikeParser.parse(transition.into));
        this.currentRequest = FlowRequest.transitionRequest(this as any, id + '', transition, isStep);
        this.onTransitionRequested(transition, isStep);
        this.currentRequest.start();
        tracker.trace(FlowRuntimeEventTiming.REQUEST_END)
    }

    requestStep(statusName: string, reducerName: string, payload: any, data: any) {
        this.assertValidStatus(statusName);
        let currentStatusName = this.getCurrentStatusName();
        if (currentStatusName !== statusName) {
            throw new Error(`car't request step on [${statusName}] as the current status is[${currentStatusName}]`);
        }

        this.requestTransition({
            transitionName: reducerName,
            payload,
            into: {
                name: statusName,
                data
            }
        }, true)
    }

    requestState(statusName: string, data: any) {
        this.assertValidStatus(statusName);
        let currentStatusName = this.getCurrentStatusName();
        if (currentStatusName !== statusName) {
            throw new Error(`car't request state on [${statusName}] as the current status is[${currentStatusName}]`);
        }

        this.requestStatus({
            name: statusName,
            data: data
        }, true)
    }


    tryToQueue (eventName: string, reaction: ReactionDef<any, any, any>): boolean {
        if (this.currentRequest == null) return false;

        this.currentRequest.queueReaction(eventName, reaction);
        return true;
    }

    private onTransitionRequested(transition: Transition, isStep: boolean) {
        this.flowEvents.addTransition(transition, isStep);
    }

    private getNextId(status: Status, preview: boolean = false): number {
        if (this.ids[status.name] == null) {
            this.ids[status.name] = 0;
        }
        let nextId = this.ids[status.name] + 1;
        if (preview) return nextId;

        this.ids[status.name] = nextId;
        return this.ids[status.name];
    }

    processStateAndReactions(statusRequest: StatusRequest, isStep: boolean): void {
        this.flowEvents.addProcessingStatus(statusRequest, isStep);
        this.flowController.processReactions(statusRequest.status.name);
    }

    flagAsSettled(statusRequest: StatusRequest, isStep: boolean): void {
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this.flowController,
            FlowRuntimeEventSource.FLOW_THREAD,
            FlowRuntimeEventType.FLAG_AS_SETTLED,
            statusRequest
        ).highlight(FlowRuntimeEventTiming.REQUEST_START, `${statusRequest.status.name}`);

        this.flowEvents.settleProcessingStatus(statusRequest, isStep);
        if (!isStep){
            tracker.highlight(FlowRuntimeEventTiming.INFO, 'STATUS', statusRequest.status)
        } else {
            tracker.highlight(FlowRuntimeEventTiming.INFO, 'STATE', statusRequest.status.data)
        }
        tracker.trace(FlowRuntimeEventTiming.REQUEST_END);
    }

    onStateRequestCompleted(stateMachineRequest: FlowRequest, queuedReactions: [string, ReactionDef<any, any>] [], queuedStatuses: Status[], queuedStates: Status[], queuedTransitions: Transition[], queuedSteps: Transition[]): void {
        if (this.currentRequest == null) {
            throw new Error(`can't complete the request for [${this.flowController.getName()} - ${stateMachineRequest.status.name}] as is not flagged as currently in process`);
        }
        if (this.currentRequest != stateMachineRequest) {
            throw new Error(`can't complete the request for [${this.flowController.getName()} - ${stateMachineRequest.status.name}] as it does not match [${this.currentRequest.status.name}]`);
        }
        if (queuedTransitions.length > 0 && queuedStatuses.length > 0) {
            throw new Error(`can't have transitions and states forked at the same time!`)
        }

        this.currentRequest = undefined;
        if (queuedTransitions.length > 1 || queuedStatuses.length > 1){
            throw new Error('TBI');
        }
        queuedTransitions.forEach(it=>this.flowController.requestTransition(it));
        queuedStatuses.forEach(it=>this.flowController.requestStatus(it));
        queuedStates.forEach(it=>this.flowController.requestState(it.name, it.data));
        queuedSteps.forEach(it=>{
            let into = StatusLikeParser.parse(it.into);
            this.flowController.requestStep(into.name, it.transitionName, it.payload, into.data)
        });
        queuedReactions.forEach(it=>this.flowController.addReaction(it[0] as any, it[1] as any));
    }

    createContext<STATUS extends keyof STATUSES>(statusLike: STATUS, doChain: IConsumer<ICallback>): Context<STATUSES, STATUS, MUTATORS> {
        let status: Status<STATUSES, STATUS> = StatusLikeParser.parse<STATUSES, STATUS>(statusLike);

        return {
            // step: this.flowController.on(status.name).steps,
            // transitions: this.flowController.on(status.name).transitions,
            getData: this.flowController.getState.bind(this.flowController),
            getStatusData: this.flowController.getStatusData.bind(this.flowController),
            do: {
                ...this.flowController.on(status.name).transitions,
                ...this.flowController.on(status.name).steps
            } as any,
            chain(cb: ICallback) {
                doChain(cb)
            },
            interruptFlow:()=> {
                this.flowController.stop();
            },
            trace:(msg: string): FlowRuntimeTracker=> {
                let tracker = this.flowOrchestrator.createRuntimeTracker(
                    this.flowController,
                    FlowRuntimeEventSource.CONTEXT,
                    FlowRuntimeEventType.USER_MSG,
                    msg
                ).highlight(FlowRuntimeEventTiming.REQUEST_START, `${msg}`);

                let flowRuntimeTracker = tracker.highlight(FlowRuntimeEventTiming.USER_TRACE, undefined, msg);
                tracker.trace(FlowRuntimeEventTiming.REQUEST_END);
                return flowRuntimeTracker;
            }
        }
    }

    getCurrentStatusName(): string {
        let currentStatus = this.flowEvents.currentStatus;
        return currentStatus == null ? undefined : currentStatus.name;
    }

    getCurrentState() {
        let currentStatus = this.flowEvents.currentStatus;
        return currentStatus == null ? undefined : currentStatus.data;
    }

    private assertValidStatus (statusName: string):void {
        if (this.flowController.on(statusName as any) == null) {
            throw new Error(`error requesting a transition into [${statusName}] unknown status, valid statuses are: [${Object.keys(this.flowController.getStatusDefs()).join(', ')}]`)
        }
    }
}
