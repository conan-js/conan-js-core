import {Status, StatusLike, StatusLikeParser} from "../domain/status";
import {FlowRequest, StatusRequest} from "./flowRequest";
import {ICallback, IConsumer, IFunction, IKeyValuePairs} from "../../index";
import {Transition} from "../domain/transitions";
import {Context} from "../domain/context";
import {ReactionDef} from "../def/reactionDef";
import {Mutators, VoidMutators} from "../domain/mutators";
import {FlowRuntimeTracker} from "./flowRuntimeTracker";
import {FlowOrchestrator} from "./flowOrchestrator";
import {FlowEventLevel, FlowEventNature, FlowEventSource, FlowEventType} from "../domain/flowRuntimeEvents";
import {FlowImpl} from "./flowImpl";
import {FlowEventsTracker} from "./flowEventsTracker";
import {MetaInfo} from "../../conan-monitor/domain/metaInfo";

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
    public requestStack: FlowRequest[] = [];

    constructor(
        readonly flowController: FlowImpl<STATUSES, MUTATORS>,
        readonly flowOrchestrator: FlowOrchestrator,
        private readonly flowEvents: FlowEventsTracker<STATUSES>
    ) {}

    requestStatus(statusLike: StatusLike, isStep: boolean): void {
        let status = StatusLikeParser.parse(statusLike);
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this.flowController,
            FlowEventSource.FLOW_THREAD,
            FlowEventType.REQUESTING_STATUS,
            statusLike
        ).start( `${status.name}`);
        this.assertValidStatus(status.name);
        if (this.currentRequest != null) {
            if (!isStep) {
                tracker.debug(`queueing status [${status.name}]`)
                this.currentRequest.queueStatus(status);
            } else {
                tracker.debug(`queueing state [${status.name}]`)
                this.currentRequest.queueState(status);
            }
            return;
        }

        let id = this.getNextId(status);
        this.currentRequest = FlowRequest.statusRequest(this as any, id + '', status, isStep);
        this.currentRequest.start();
        tracker.end();
    }

    requestTransition(transition: Transition, isStep: boolean): this {
        let intoStatusName = StatusLikeParser.parse(transition.into).name;
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this.flowController,
            FlowEventSource.FLOW_THREAD,
            FlowEventType.REQUESTING_TRANSITION,
            transition
        ).start( `${transition.transitionName}`);
        tracker.info( isStep ? 'step' : 'transition', [transition.transitionName, transition.payload])
        this.assertValidStatus(intoStatusName);

        if (this.currentRequest != null) {
            if (!isStep) {
                tracker.debug( `queueing transition [${transition.transitionName}]`)
                this.currentRequest.queueTransition(transition);
            } else {
                tracker.debug(`queueing step [${transition.transitionName}]`)
                this.currentRequest.queueStep(transition);
            }
            return;
        }

        let id = this.getNextId(StatusLikeParser.parse(transition.into));
        this.currentRequest = FlowRequest.transitionRequest(this as any, id + '', transition, isStep);
        this.onTransitionRequested(transition, isStep);
        this.currentRequest.start();
        tracker.end()
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
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this.flowController,
            FlowEventSource.FLOW_THREAD,
            FlowEventType.PROCESSING_STATUS,
        ).start( `${statusRequest.status.name}`);

        tracker.info(`processing status - ${statusRequest.status.name}`, this.flowController.flowDef.nature === FlowEventNature.MAIN ? statusRequest.status.data : undefined);
        this.flowEvents.addProcessingStatus(statusRequest, isStep);
        tracker.end();
        this.flowController.processReactions(statusRequest.status.name);
    }

    flagAsSettled(statusRequest: StatusRequest, isStep: boolean): void {
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this.flowController,
            FlowEventSource.FLOW_THREAD,
            FlowEventType.SETTLING_STATUS,
        ).start( `${statusRequest.status.name}`);

        this.flowEvents.settleProcessingStatus(statusRequest, isStep);
        let currentNature = this.flowController.flowDef.nature;
        let payload = currentNature !== FlowEventNature.ASYNC ? statusRequest.status.data : (statusRequest.status.data as MetaInfo) ? (statusRequest.status.data as MetaInfo).status : undefined;
        if (!isStep){
            tracker.milestone( `STATUS - ${statusRequest.status.name}`, payload)
        } else {
            tracker.milestone(  'STATE', payload)
        }
        tracker.end();
    }

    onStateRequestCompleted(stateMachineRequest: FlowRequest, queuedReactions: [string, ReactionDef<any, any>] [], queuedStatuses: Status[], queuedStates: Status[], queuedTransitions: Transition[], queuedSteps: Transition[]): void {
        let tracker = this.flowOrchestrator.createRuntimeTracker(
            this.flowController,
            FlowEventSource.FLOW_THREAD,
            FlowEventType.STATUS_REQUEST_COMPLETED,
        ).start( `${stateMachineRequest.status.name}`);

        let rootRequestTracker = this.flowOrchestrator.createRuntimeTracker(
            this.flowController,
            FlowEventSource.FLOW_THREAD,
            FlowEventType.ROOT_REQUEST,
        )

        if (this.requestStack.length === 0) {
            rootRequestTracker.debug(`creating new execution stack: [${stateMachineRequest.status.name}]`);
            rootRequestTracker.start(`${stateMachineRequest.status.name}`)
        }  else {
            rootRequestTracker.debug(`adding to current execution stack [${this.requestStack.length}-${this.requestStack[0].status.name}]`);
            rootRequestTracker.continue(`${stateMachineRequest.status.name}`)
        }



        if (this.currentRequest == null) {
            throw new Error(`can't complete the request for [${this.flowController.getName()} - ${stateMachineRequest.status.name}] as is not flagged as currently in process`);
        }
        if (this.currentRequest != stateMachineRequest) {
            throw new Error(`can't complete the request for [${this.flowController.getName()} - ${stateMachineRequest.status.name}] as it does not match [${this.currentRequest.status.name}]`);
        }
        if (queuedTransitions.length > 0 && queuedStatuses.length > 0) {
            throw new Error(`can't have transitions and states forked at the same time!`)
        }

        this.requestStack.push(this.currentRequest);
        this.currentRequest = undefined;
        if (queuedTransitions.length > 1 || queuedStatuses.length > 1){
            throw new Error('TBI');
        }

        function logArray<T>(
            name: string,
            queuedItems: T[],
            mapper: IFunction<T, string>
        ) {
            tracker.withLevel(
                queuedItems.length === 0 ? FlowEventLevel.DEBUG : FlowEventLevel.INFO,
                `executing ${name}: [(${queuedItems.length}) - ${queuedItems.map(mapper).join(',')}]`
            );
        }

        logArray('queued transitions', queuedTransitions, (it)=>it.transitionName);
        queuedTransitions.forEach(it=>this.flowController.requestTransition(it));

        logArray('queued statuses', queuedStatuses, (it)=>it.name);
        queuedStatuses.forEach(it=>this.flowController.requestStatus(it));

        logArray('queued states', queuedStates, (it)=>it.name);
        queuedStates.forEach(it=>this.flowController.requestState(it.name, it.data));

        logArray('queued steps', queuedSteps, (it)=>it.transitionName);
        queuedSteps.forEach(it=>{
            let into = StatusLikeParser.parse(it.into);
            this.flowController.requestStep(into.name, it.transitionName, it.payload, into.data)
        });

        logArray('queued reactions', queuedReactions, (it)=>it[1].name);
        queuedReactions.forEach(it=>this.flowController.addReaction(it[0] as any, it[1] as any));


        this.requestStack.pop();
        if (this.requestStack.length === 0) {
            rootRequestTracker.debug(`execution stack completed: [${stateMachineRequest.status.name}]`);
            rootRequestTracker.end();
        }
        tracker.end();
    }

    createContext<STATUS extends keyof STATUSES>(statusLike: STATUS, doChain: IConsumer<ICallback>): Context<STATUSES, STATUS, MUTATORS> {
        let status: Status<STATUSES, STATUS> = StatusLikeParser.parse<STATUSES, STATUS>(statusLike);

        return {
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
            log:(msg: string): FlowRuntimeTracker=> {
                return this.flowController.log(msg);
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
