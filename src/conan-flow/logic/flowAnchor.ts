import {LastStatusData, StatusDataProducer} from "../domain/flowEvents";
import {Status} from "../domain/status";
import {IProducer} from "../../index";
import {FlowThread, OnContextProxyParams} from "./flowThread";
import {Mutators, VoidMutators} from "../domain/mutators";
import {FlowOrchestrator} from "./flowOrchestrator";
import {FlowImpl} from "./flowImpl";
import {FlowEventsTracker} from "./flowEventsTracker";
import {FlowEventSource, FlowEventType} from "../domain/flowRuntimeEvents";
import {FlowRuntimeTracker} from "./flowRuntimeTracker";

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
    public currentThread: CurrentThread<STATUSES, MUTATORS>;

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
        return <STATUS extends keyof STATUSES>(statusNameOpt?: STATUS, defaultValue?: STATUSES[STATUS]): STATUSES[STATUS] => {
            let statusName = statusNameOpt != null ? statusNameOpt : this.currentStatus.name;
            let statusData: LastStatusData<STATUSES> = this.currentThread.flowEvents.getLastStates();
            if (Object.keys(statusData).indexOf(statusName) === -1) {
                return defaultValue;
            }
            return statusData[statusName];
        };
    }

    getDataFn<STATUS extends keyof STATUSES>(status: STATUS): IProducer<STATUSES[STATUS]> {
        return ():STATUSES[STATUS]=> {
            if (this.currentThread == null){
                throw new Error(`error getting the data function associated to this flow, this might happen if you try to mutate the state of the flow before it has been started.`)
            }
            let currentStatus = this.currentThread.flowEvents.currentStatus.name;
            if (currentStatus === '$init'){
                return undefined;
            }
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

        let isNotGoingToStop = param.result && param.result.name != "$stop";
        let isNotCurrentlyOnInit = this.currentStatus && this.currentStatus.name != "$init";
        if (isNotGoingToStop && isNotCurrentlyOnInit &&(!this.currentStatus || this.currentStatus.name !== expectedStatusName)) {
            throw Error(`unable to request [${param.methodName}] as is meant for status [${expectedStatusName}], but the current status is [${this.currentStatus ? this.currentStatus.name : '-'}]`);
        }

        if (type === BindBackType.STEP) {
            let initialStep = this.currentThread.flowThread.getCurrentStatusName() === '$init';
            if (initialStep){
                this.currentThread.flowThread.requestTransition(
                    {
                        into: {
                            name: expectedStatusName,
                            data: param.result
                        },
                        payload: param.payload,
                        transitionName: param.methodName
                    },
                    false
                )

            } else {
                this.currentThread.flowThread.requestStep(
                    param.statusName,
                    param.methodName,
                    param.payload,
                    param.result
                )
            }
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

    createRuntimeTracker(runtimeEvent: FlowEventType, payload?: any): FlowRuntimeTracker {
        let flowThread = this.currentThread.flowThread;
        let flowOrchestrator = flowThread.flowOrchestrator;
        return flowOrchestrator.createRuntimeTracker(
            flowThread.flowController,
            FlowEventSource.FLOW_CONTROLLER,
            runtimeEvent,
            payload
        )
    }

}
