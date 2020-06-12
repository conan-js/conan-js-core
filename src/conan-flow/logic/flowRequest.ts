import {Status, StatusLikeParser} from "../domain/status";
import {FlowThread} from "./flowThread";
import {Transition} from "../domain/transitions";
import {ReactionDef} from "../def/reactionDef";

export interface StatusRequest {
    status: Status,
    id: string
}

export class FlowRequest {
    private queuedReactions: [string, ReactionDef<any, any>] []= [];
    private queuedTransitions: Transition[] = [];
    private queuedSteps: Transition[] = [];
    private queuedStatuses: Status[] = [];
    private queuedStates: Status[] = [];

    private started: boolean = false;


    public static statusRequest(smFlow: FlowThread<any>, id: string, state: Status, isStep: boolean): FlowRequest {
        return new FlowRequest(smFlow, id, state, isStep);
    }

    public static transitionRequest(smFlow: FlowThread<any>, id: string, transition: Transition, isStep: boolean): FlowRequest {
        return new FlowRequest(smFlow, id, StatusLikeParser.parse(transition.into), isStep);
    }

    constructor(
        public readonly flowThread: FlowThread<any>,
        public readonly id: string,
        public readonly status: Status,
        public readonly isStep: boolean
    ) {
    }


    private processingStatus: StatusRequest = {
        id: this.id,
        status: this.status
    };

    start(): void {
        if (this.started) {
            throw new Error('unexpected');
        }
        this.started = true;

        this.flowThread.processStateAndReactions(this.processingStatus, this.isStep);
        this.flowThread.flagAsSettled(this.processingStatus, this.isStep);
        this.flowThread.onStateRequestCompleted(
            this,
            this.queuedReactions,
            this.queuedStatuses,
            this.queuedStates,
            this.queuedTransitions,
            this.queuedSteps
        );
    }

    queueStatus(state: Status) {
        this.queuedStatuses.push(state);
    }

    queueTransition(transition: Transition): this {
        this.queuedTransitions.push(transition);
        return this;
    }

    queueStep(transition: Transition) {
        this.queuedSteps.push(transition);
        return this;
    }

    queueState(status: Status) {
        this.queuedStates.push(status);
    }

    queueReaction(eventName: string, reaction: ReactionDef<any, any>) {
        this.queuedReactions.push([eventName, reaction])
    }
}
