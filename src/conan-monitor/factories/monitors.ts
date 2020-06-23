import {Reducers} from "../../conan-thread/domain/reducers";
import {MonitorFacade} from "../domain/monitorFacade";
import {MonitorImpl} from "../logic/monitorImpl";
import {Threads} from "../../conan-thread/factories/threads";
import {MonitorInfo, MonitorStatus} from "../domain/monitorInfo";
import {MonitorActions} from "../domain/monitorActions";
import {MonitorDef} from "../domain/monitorDef";
import {FlowEventNature, FlowEventTiming, FlowEventType} from "../../conan-flow/domain/flowRuntimeEvents";
import {AsynAction} from "../domain/asynAction";

export class Monitors {
    static create<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = any> (
        data: MonitorDef<DATA, REDUCERS, ACTIONS>
    ): MonitorFacade<DATA, REDUCERS, ACTIONS> {
        let asyncThread = this.createAsyncThread(data);
        let mainThread = Threads.create<DATA, REDUCERS, ACTIONS>({
            ...data,
            nature: data.nature,
            pipelineListener: (event)=> {
                if (event.runtimeEvent === FlowEventType.MONITORING){
                    if ( event.timing === FlowEventTiming.START) {
                        asyncThread.do.tick (event.payload)
                    } else if (event.timing === FlowEventTiming.END){
                        asyncThread.do.unTick (event.payload, false)
                    } else if (event.timing === FlowEventTiming.CANCEL){
                        asyncThread.do.unTick (event.payload, true)
                    }
                    return;
                }
            }
        });
        let monitorImpl = new MonitorImpl<DATA, REDUCERS, ACTIONS>(
            mainThread,
            asyncThread
        );
        return new MonitorFacade<DATA, REDUCERS, ACTIONS>(
            monitorImpl,
            mainThread.actions
        );
    }

    private static createAsyncThread<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = void>(data: MonitorDef<DATA, REDUCERS, ACTIONS>) {
        return Threads.create<MonitorInfo, {}, MonitorActions>({
            name: `async[${data.name}]`,
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
            nature: FlowEventNature.AUX
        });
    }
}
