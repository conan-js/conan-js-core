import * as React from "react";
import {ReactElement} from "react";
import {DataReactionDef, DataReactionLock} from "../conan-thread/domain/dataReaction";
import {ConnectedState, StateConnect, StateMapConnect} from "./connect/stateConnect";
import {Conan, IBiFunction, IConsumer, IFunction} from "..";
import {StateLive} from "./live/stateLive";
import {DefaultActionsFn} from "../conan-flow/domain/actions";
import {MonitorFacade} from "../conan-monitor/domain/monitorFacade";
import {Pipes} from "../conan-pipe/factories/pipes";
import {MonitorInfo} from "../conan-monitor/domain/monitorInfo";
import {Thread} from "../conan-thread/logic/thread";
import {ThreadFacade} from "../conan-thread/domain/threadFacade";
import {ITriFunction} from "../conan-utils/typesHelper";
import {PipeThreadDef} from "../conan-pipe/domain/pipeThreadDef";
import {Objects} from "../conan-utils/objects";
import {FlowEventNature} from "../conan-flow/domain/flowRuntimeEvents";
import {FlowEventsTracker} from "../conan-flow/logic/flowEventsTracker";
import {Monitors} from "../conan-monitor/factories/monitors";
import {MonitorActions} from "../conan-monitor/domain/monitorActions";
import {ConanFlow} from "./conanFlow";
import {MetaInfo} from "../conan-monitor/domain/metaInfo";
import {MetaMutators, MetaStatuses} from "../conan-monitor/domain/metaFlow";

export class ConanState<DATA, ACTIONS = DefaultActionsFn<DATA>> {

    constructor(
        private readonly monitor: MonitorFacade<DATA, any, ACTIONS>
    ) {
    }

    getName(): string {
        return this.monitor.getName();
    }

    connectMap <PROPS>(
        toConnect: React.ComponentType<PROPS>,
        mapper: IBiFunction<DATA, ACTIONS, PROPS>
    ): ReactElement<PROPS> {
        return <StateMapConnect<DATA, PROPS, ACTIONS>
            from={this}
            into={toConnect}
            mapper={mapper}
        />;
    }

    connectData (
        toConnect: React.ComponentType<DATA>,
    ): ReactElement<DATA> {
        return <StateMapConnect<DATA, DATA, ACTIONS>
            from={this}
            into={toConnect}
            mapper={(data)=>data}
        />;
    }

    connect (
        toConnect: React.ComponentType<ConnectedState<DATA, ACTIONS>>,
    ): ReactElement<ConnectedState<DATA, ACTIONS>> {
        return <StateConnect<DATA, ACTIONS>
            from={this}
            into={toConnect}
        />;
    }

    connectLive (
        renderer: IBiFunction<DATA, ACTIONS, ReactElement | ReactElement[]>,
        fallbackValue?: DATA
    ): ReactElement{
        return <StateLive<DATA, ACTIONS>
            from={this}
            renderer={renderer}
            fallbackValue={fallbackValue}
        />;
    }

    addAsyncReaction(def: DataReactionDef<DATA>): DataReactionLock {
        return this.monitor.addAsyncReaction(def);
    }

    addDataReaction(def: DataReactionDef<DATA>): DataReactionLock {
        return this.monitor.addReaction(def);
    }

    get do(): ACTIONS & DefaultActionsFn<DATA> {
        return this.monitor.do;
    }

    start(): this {
        this.monitor.start();
        return this;
    }

    stop(eventsConsumer: (events) => void): this {
        this.monitor.stop(eventsConsumer);
        return this;
    }

    get actions (): ACTIONS & DefaultActionsFn<DATA>{
        return this.monitor.actions as any;
    }

    getData(): DATA {
        return this.monitor.getData();
    }

    asyncMerge<T>(
        baseValue: T,
        monitorMerger: (ITriFunction<MonitorInfo, DATA, T, T>),
        dataMerger: ITriFunction<DATA, MonitorInfo, T, T>
    ): ConanState<T, ACTIONS> {
        let mergedThread: Thread<T> = Pipes.fromMonitor<DATA, T>(
            `monitor[${this.getName()}]`,
            this.monitor as any,
            monitorMerger,
            dataMerger, {
                initialData: baseValue,
                nature: FlowEventNature.HELPER
            }
        );

        return new ConanState<T, ACTIONS>(
            Monitors.fromThread(new ThreadFacade<T, {}, ACTIONS>(
                mergedThread,
                this.actions
            ))
        );
    }

    filter(mapper: (current: DATA, previous: DATA) => boolean): ConanState<DATA> {
        let state: ThreadFacade<DATA> = Pipes.filter<DATA>(
            `filter=>${this.getName()}`,
            this.mainThread as any,
            mapper
        );
        return new ConanState<DATA>(
            Monitors.fromThread(state) as any
        );
    }

    map<T>(mapper: IFunction<DATA, T>): ConanState<T> {
        let state: ThreadFacade<T> = Pipes.map<DATA, T>(
            `map=>${this.getName()}`,
            this.mainThread as any,
            mapper
        );
        return new ConanState<T>(
            Monitors.fromThread(state) as any
        );
    }

    merge<T, TO_MERGE>(
        toMerge$: ConanState<TO_MERGE, any>,
        merger: ITriFunction<DATA, TO_MERGE, T, T>
    ): ConanState<T>  {
        let state: ThreadFacade<T> = Pipes.merge<DATA, TO_MERGE, T>(
            `merge=>${this.getName()}`,
            this.mainThread,
            merger,
            toMerge$.mainThread,
            (right, left, current)=>merger(left, right, current)
        );
        return new ConanState<T>(
            Monitors.fromThread(state) as any
        );
    }

    tuple<TO_MERGE>(
        toMerge$: ConanState<TO_MERGE, any>,
    ): ConanState<[DATA, TO_MERGE]>  {
        let state: ThreadFacade<[DATA, TO_MERGE]> = Pipes.tupleCombine<DATA, TO_MERGE>(
            `mergeTuple=>${this.getName()}`,
            this.mainThread,
            toMerge$.mainThread,
        );
        return new ConanState<[DATA, TO_MERGE]>(
            Monitors.fromThread(state) as any
        );
    }


    get mainThread (): ThreadFacade<DATA, any, ACTIONS>{
        return this.monitor.mainThread;
    }

    get asyncState (): ConanState<MonitorInfo, MonitorActions>{
        return Conan.fromThread(this.monitor.asyncThread);
    }

    get metaFlow (): ConanFlow<MetaStatuses, MetaMutators>{
        return Conan.fromFlow(this.monitor.metaFlow);
    }


    static combine<T extends {}, ACTIONS = void>(
        name: string,
        fromState: {[KEY in keyof T]: ConanState<T[KEY], any>},
        pipeThreadDef ?: PipeThreadDef<T, {}, ACTIONS>
    ) : ConanState<T, ACTIONS>{
        let threadFacade = Pipes.combine<T, ACTIONS>(
            name,
            Objects.mapKeys<ConanState<any>, ThreadFacade<any, any, any>>(fromState, conanState=>conanState.mainThread) as any,
            pipeThreadDef
        );
        return new ConanState<T, ACTIONS>(Monitors.fromThread(threadFacade));
    }

    getEvents(): FlowEventsTracker<{ nextData: DATA}>{
        return this.mainThread.getEvents();
    }

    always(dataConsumer: IConsumer<DATA>) {
        this.addDataReaction({
            name: `always`,
            dataConsumer: (data)=>dataConsumer(data)
        })
    }

    openTransaction (name?: string): void{
        this.monitor.openTransaction(name);
    }

    closeTransaction (callback?: IConsumer<DATA>): void{
        this.monitor.closeTransaction(callback);
    }
}
