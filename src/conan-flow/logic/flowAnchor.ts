import {LastStatusData, StatusDataProducer} from "../domain/flowEvents";
import {Status} from "../domain/status";
import {IProducer} from "../../index";
import {FlowThread, OnContextProxyParams} from "./flowThread";
import {Mutators, VoidMutators} from "../domain/mutators";
import {FlowOrchestrator} from "./flowOrchestrator";
import {FlowImpl} from "./flowImpl";
import {FlowEventsTracker} from "./flowEventsTracker";
import {FlowRuntimeEventTiming} from "../domain/flowRuntimeEvents";

export enum BindBackType {
    STEP = "STEP",
    TRANSITION = "TRANSITION",
}

export interface CurrentThread<
    STATUSES,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
> {
    flowEvents: FlowEventsTracker<STATUSES>;
    flowThread: FlowThread<STATUSES, MUTATORS>;
}

export class FlowAnchor<
    STATUSES,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
> {
    private currentThread: CurrentThread<STATUSES, MUTATORS>;

    createNewThread(flowController: FlowImpl<STATUSES, MUTATORS>, flowOrchestrator: FlowOrchestrator): FlowThread<STATUSES, MUTATORS> {
        let flowEvents = new FlowEventsTracker<STATUSES>();
        let flowThread = new FlowThread<STATUSES, MUTATORS>(flowController, flowOrchestrator, flowEvents);
        this.currentThread = {
            flowEvents: flowEvents,
            flowThread: flowThread,
        }
        return flowThread;
    }

    getCurrentEvents(): FlowEventsTracker<STATUSES> {
        return this.currentThread.flowEvents;
    }

    get currentStatus(): Status {
        if (!this.currentThread) return undefined;
        return this.currentThread.flowEvents.currentStatus;
    }

    getStatusDataProducerFn(): StatusDataProducer<STATUSES> {
        return <STATUS extends keyof STATUSES>(statusName: STATUS, defaultValue: STATUSES[STATUS]): STATUSES[STATUS] => {
            let statusData: LastStatusData<STATUSES> = this.currentThread.flowEvents.getLastStates();
            if (Object.keys(statusData).indexOf(statusName as any) === -1) {
                return defaultValue;
            }
            return statusData[statusName];
        };
    }

    getDataFn<STATUS extends keyof STATUSES>(status: STATUS): IProducer<STATUSES[STATUS]> {
        return ():STATUSES[STATUS]=> {
            let currentStatus = this.currentThread.flowEvents.currentStatus.name;
            if (status !== currentStatus) {
                throw new Error(`unexpected error trying to retrieve the last status for [${status}, but the current status is [${currentStatus}]]`)
            }
            return this.currentThread.flowEvents.getLastState(status)
        };
    }

    bindBack<STATUS extends keyof STATUSES>(
        expectedStatusName: STATUS,
        param: OnContextProxyParams,
        type: BindBackType
    ) {
        if (!this.currentThread.flowThread.flowController.isRunning) {
            return
        }

        if (param.result.name != "$stop" && (!this.currentStatus || this.currentStatus.name !== expectedStatusName)) {
            throw Error(`unable to request [${param.methodName}] as is meant for status [${expectedStatusName}], but the current status is [${this.currentStatus ? this.currentStatus.name : '-'}]`);
        }

        if (type === BindBackType.STEP) {
            this.currentThread.flowThread.requestStep(
                param.statusName,
                param.methodName,
                param.payload,
                param.result
            )
        } else {
            this.currentThread.flowThread.requestTransition(
                {
                    into: param.result,
                    payload: param.payload,
                    transitionName: param.methodName
                },
                false
            )
        }
    }

    getStatusData(): { [STATUS in keyof STATUSES]?: STATUSES[STATUS] } {
        return this.currentThread.flowEvents.getLastStates();
    }
}
