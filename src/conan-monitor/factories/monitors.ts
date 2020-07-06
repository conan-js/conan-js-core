import {Reducers} from "../../conan-thread/domain/reducers";
import {MonitorFacade} from "../domain/monitorFacade";
import {MonitorImpl} from "../logic/monitorImpl";
import {Threads} from "../../conan-thread/factories/threads";
import {MonitorInfo, MonitorStatus} from "../domain/monitorInfo";
import {MonitorActions} from "../domain/monitorActions";
import {MonitorDef} from "../domain/monitorDef";
import {FlowEvent, FlowEventNature, FlowEventTiming, FlowEventType} from "../../conan-flow/domain/flowRuntimeEvents";
import {AsynAction} from "../domain/asynAction";
import {Flows} from "../../index";
import {MetaMutators, MetaMutatorsFactory, MetaStatuses} from "../domain/metaFlow";
import {MetaInfo, MetaStatus} from "../domain/metaInfo";
import {FlowFacade} from "../../conan-flow/domain/flowFacade";
import {ThreadFacade} from "../../conan-thread/domain/threadFacade";

export class Monitors {
    static fromThread<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = any> (
        thread: ThreadFacade<DATA, REDUCERS, ACTIONS>
    ): MonitorFacade<DATA, REDUCERS, ACTIONS> {
        let monitorFacade = Monitors.create({
            name: thread.getName(),
            initialData: thread.getDefinition().initialData,
            nature: thread.getDefinition().nature,
            actions: thread.getDefinition().actions as any,
            autoBind: thread.getDefinition().autoBind,
            reducers: thread.getDefinition().reducers as any
        }, thread.actions);
        thread.addReaction({
            name: `pipe`,
            dataConsumer: (data)=>monitorFacade.do.$update(data)
        })
        return monitorFacade as any;
    }
    static create<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = any> (
        data: MonitorDef<DATA, REDUCERS, ACTIONS>,
        actions?: ACTIONS
    ): MonitorFacade<DATA, REDUCERS, ACTIONS> {

        let asyncThread = this.createAsyncThread(data);
        let metaFlow = this.createMetaFlow(data.name);
        let mainThread = Threads.create<DATA, REDUCERS, ACTIONS>({
            ...data,
            nature: data.nature,
            pipelineListener: (event)=> {
                this.orchestrate(event,  asyncThread, metaFlow);
            }
        }, actions);
        let monitorImpl = new MonitorImpl<DATA, REDUCERS, ACTIONS>(
            mainThread,
            asyncThread,
            metaFlow
        );
        return new MonitorFacade<DATA, REDUCERS, ACTIONS>(
            monitorImpl,
            mainThread.actions
        );
    }

    private static createMetaFlow(parentName: string): FlowFacade<MetaStatuses, MetaMutators> {
        let flowFacade = Flows.create<MetaStatuses, MetaMutators>({
            name: `${parentName}=>[meta]`,
            statuses: {
                starting: {
                    transitions: getStatus => MetaMutatorsFactory.createTransitions (getStatus as any, 'starting'),
                    steps: getState =>MetaMutatorsFactory.createSteps(getState)
                },
                init: {
                    transitions: getStatus => MetaMutatorsFactory.createTransitions (getStatus as any, 'init'),
                    steps: getState =>MetaMutatorsFactory.createSteps(getState)
                },
                running: {
                    transitions: getStatus => MetaMutatorsFactory.createTransitions (getStatus as any, 'running'),
                    steps: getState =>MetaMutatorsFactory.createSteps(getState)
                },
                idle:{
                    transitions: getStatus => MetaMutatorsFactory.createTransitions (getStatus as any, 'idle'),
                    steps: getState =>MetaMutatorsFactory.createSteps(getState)
                },
                idleOnTransaction:{
                    transitions: getStatus => MetaMutatorsFactory.createTransitions (getStatus as any, 'idleOnTransaction'),
                    steps: getState =>MetaMutatorsFactory.createSteps(getState)
                },
                error:{
                    transitions: getStatus => MetaMutatorsFactory.createTransitions (getStatus as any, 'error'),
                    steps: getState =>MetaMutatorsFactory.createSteps(getState)
                }
            },
            initialStatus: {
                name: 'starting',
                data: {
                    status: MetaStatus.STARTING,
                    transactionCount: 0
                } as MetaInfo
            },
            nature: FlowEventNature.META
        });
        flowFacade.start();
        return flowFacade;
    }

    private static createAsyncThread<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = void>(data: MonitorDef<DATA, REDUCERS, ACTIONS>) {
        return Threads.create<MonitorInfo, {}, MonitorActions>({
            name: `${data.name}=>[async]`,
            actions: thread => ({
                tick(toMonitor: AsynAction<any>) {
                    thread.reducers.$update(current => ({
                        status: MonitorStatus.ASYNC_START,
                        currentAction: toMonitor,
                        inProgressActions: [...current.inProgressActions, toMonitor]
                    }))
                },
                unTick(toMonitor: AsynAction<any>, cancelled: boolean) {
                    thread.reducers.$update(current => {
                        return ({
                            status: cancelled ? MonitorStatus.ASYNC_CANCELLED : MonitorStatus.ASYNC_FULFILLED,
                            currentAction: toMonitor,
                            inProgressActions: current.inProgressActions.filter(it => it !== toMonitor)
                        });
                    });


                    if (thread.getData().inProgressActions.length === 0)
                        thread.reducers.$update(current => ({
                            inProgressActions: [],
                            currentAction: undefined,
                            status: MonitorStatus.IDLE
                        }))
                }
            }),
            initialData: {
                inProgressActions: [],
                status: MonitorStatus.IDLE,
                currentAction: undefined
            },
            nature: FlowEventNature.ASYNC
        });
    }

    private static orchestrate<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = any>(
        event: FlowEvent,
        asyncThread: ThreadFacade<MonitorInfo, {}, MonitorActions>,
        metaFlow: FlowFacade<MetaStatuses, MetaMutators>
    ) {
        let timing = event.timing;

        if (event.type === FlowEventType.ERROR_USER_CODE){
            metaFlow.assertOn(metaFlow.getCurrentStatusName() as any, onAny => onAny.do.toError())
        }

        if (event.type === FlowEventType.MONITORING) {
            if (timing === FlowEventTiming.START) {
                asyncThread.do.tick(event.payload);
                metaFlow.assertOn(metaFlow.getCurrentStatusName() as any, onAny => onAny.do.toRunning())
            } else if (timing === FlowEventTiming.END) {
                asyncThread.do.unTick(event.payload, false)
            } else if (timing === FlowEventTiming.CANCEL) {
                asyncThread.do.unTick(event.payload, true)
            }
            return;
        }

        if (event.type === FlowEventType.MONITOR_TRANSACTION && (timing === FlowEventTiming.START || timing === FlowEventTiming.END)) {
            switch (metaFlow.getCurrentStatusName()) {
                case 'starting':
                    metaFlow.assertOn('starting', onStarting => onStarting.do.$onTransaction(timing));
                    break;
                case 'init':
                    metaFlow.assertOn('init', onInit => onInit.do.$onTransaction(timing));
                    break;
                case 'running':
                    metaFlow.assertOn('running', onRunning => onRunning.do.$onTransaction(timing));
                    break;
                case 'idle':
                    metaFlow.assertOn('idle', onIdle => onIdle.do.$onTransaction(timing));
                    break;
                case 'idleOnTransaction':
                    metaFlow.assertOn('idleOnTransaction', onIdle => {
                        onIdle.do.$onTransaction(timing);
                        if ( onIdle.getData().transactionCount === 0 && timing === FlowEventTiming.END){
                            onIdle.do.toIdle();
                        }
                    });
                    break;
            }
        }

        if (event.type === FlowEventType.ROOT_REQUEST) {
            if (timing === FlowEventTiming.START || timing === FlowEventTiming.CONTINUE) {
                if (event.flowController.getCurrentStatusName() === '$init') return;

                switch (metaFlow.getCurrentStatusName()) {
                    case 'idle':
                        metaFlow.assertOn('idle', onInit => onInit.do.toRunning());
                        break;
                    case 'idleOnTransaction':
                        metaFlow.assertOn('idleOnTransaction', onInit => onInit.do.toRunning());
                        break;
                    case 'init':
                        metaFlow.assertOn('init', onInit => onInit.do.toRunning());
                        break;
                }
            } else if (timing === FlowEventTiming.END) {
                switch (metaFlow.getCurrentStatusName()) {
                    case 'starting':
                        metaFlow.assertOn('starting', onStarting => onStarting.do.toInit());
                        break;
                    case 'init':
                        metaFlow.assertOn('init', onInit => onInit.do.toIdle());
                        break;
                    case 'running':
                        if (asyncThread.getData().status === MonitorStatus.IDLE){
                            metaFlow.assertOn('running', onRunning => onRunning.do.toIdle());
                        }
                        break;
                    case 'idleOnTransaction':
                        if (asyncThread.getData().status === MonitorStatus.IDLE) {
                            metaFlow.assertOn('idleOnTransaction', onInit => onInit.do.toIdle());
                        }
                        break;
                }
            }
        }
    }
}
