import {expect} from "chai";

import {MonitorFacade} from "../../../../src/core/conan-monitor/domain/monitorFacade";
import {Asap, Asaps} from "../../../../src/core/conan-utils/asap";
import {Monitors} from "../../../../src/core/conan-monitor/factories/monitors";
import {MonitorInfo, MonitorStatus} from "../../../../src/core/conan-monitor/domain/monitorInfo";
import {extractNamesFromMonitorInfos} from "../../utils/asyncUtils";
import {MockTodoListServiceImpl} from "../../utils/todos";
import {IFunction, IProducer} from "../../../../src/core";

describe(`simple monitor`, function () {
    interface MonitorActions {
        setTo3Async (): Asap<number>;
        setTo5Async (): Asap<number>;
    }
    let Counter$: IProducer<MonitorFacade<number, { }, MonitorActions>> = ()=>Monitors.create<number, {}, MonitorActions>({
        name: 'counter',
        initialData: 0,
        actions: thread=>({
            setTo3Async(): Asap<number> {
                return thread.monitor(
                    Asaps.delayed<number>(3, 100),
                    (value, reducers)=>reducers.$update(value),
                    'setTo3Async',
                    3
                )
            },
            setTo5Async(): Asap<number> {
                return thread.monitor(
                    Asaps.delayed<number>(5, 250),
                    (value, reducers)=>reducers.$update(value),
                    'setTo5Async',
                    5
                )
            }

        })
    })

    it ('should tell us that is loading anything', (done)=>{
        let monitorInfos: MonitorInfo[] = [];
        let counter = Counter$();
        counter.addAsyncReaction({
            dataConsumer: (monitorInfo)=>monitorInfos.push(monitorInfo),
            name: 'listening to monitor info'
        })

        counter.do.setTo3Async ();
        setTimeout(()=>doTest() ,200)
        const doTest = ()=>{
            let expected = extractNamesFromMonitorInfos(monitorInfos);
            expect (expected).to.deep.eq([{
                status: MonitorStatus.IDLE,
                inProgressActions: []
            }, {
                status: MonitorStatus.ASYNC_START,
                currentAction: 'setTo3Async',
                inProgressActions: ['setTo3Async']
            }, {
                status: MonitorStatus.ASYNC_FULFILLED,
                currentAction: 'setTo3Async',
                inProgressActions: []
            }, {
                status: MonitorStatus.IDLE,
                inProgressActions: []
            }]);
            done();
        }
    })

    it ('should merge the monitor updates with the data', (done)=>{
        let monitorInfos: MonitorInfo[] = [];
        let counter = Counter$();
        counter.addAsyncReaction({
            name: `accumulate`,
            dataConsumer: (monitorInfo)=> {
                if (monitorInfo.status === MonitorStatus.ASYNC_START && monitorInfo.currentAction.name === 'setTo5Async'){
                    setTimeout(()=>monitorInfo.currentAction.asap.cancel(), 200)
                }
                monitorInfos.push(monitorInfo)
            }
        })


        counter.do.setTo3Async();
        counter.do.setTo3Async();
        counter.do.setTo5Async();

        setTimeout(()=>doTest() ,400)
        const doTest = ()=>{
            expect(counter.getEvents().serializeStates({excludeInit: true, excludeStop: true}).map(it=>it.data)).to.deep.eq([
                0,3,3
            ])

            expect(extractNamesFromMonitorInfos(monitorInfos)).deep.eq([{
                status: MonitorStatus.IDLE,
                inProgressActions: []
            }, {
                status: MonitorStatus.ASYNC_START,
                currentAction: 'setTo3Async',
                inProgressActions: ['setTo3Async']
            }, {
                status: MonitorStatus.ASYNC_START,
                currentAction: 'setTo3Async',
                inProgressActions: ['setTo3Async', 'setTo3Async']
            }, {
                status: MonitorStatus.ASYNC_START,
                currentAction: 'setTo5Async',
                inProgressActions: ['setTo3Async', 'setTo3Async', 'setTo5Async']
            },{
                status: MonitorStatus.ASYNC_FULFILLED,
                currentAction: 'setTo3Async',
                inProgressActions: ['setTo3Async', 'setTo5Async']
            },{
                status: MonitorStatus.ASYNC_FULFILLED,
                currentAction: 'setTo3Async',
                inProgressActions: ['setTo5Async',]
            }, {
                currentAction: "setTo5Async",
                status: MonitorStatus.ASYNC_CANCELLED,
                inProgressActions: [],
            },{
                status: MonitorStatus.IDLE,
                inProgressActions: []
            }]);
            done();
        };
    })

})
