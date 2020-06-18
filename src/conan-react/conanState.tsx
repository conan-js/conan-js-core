import * as React from "react";
import {ReactElement} from "react";
import {DataReactionDef, DataReactionLock} from "../conan-thread/domain/dataReaction";
import {ConnectedState, StateConnect, StateMapConnect} from "./connect/stateConnect";
import {IBiFunction, IFunction, IPredicate} from "..";
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

export class ConanState<DATA, ACTIONS = DefaultActionsFn<DATA>> {

    constructor(
        private readonly state: MonitorFacade<DATA, any, ACTIONS> | ThreadFacade<DATA, any, ACTIONS>
    ) {
    }

    getName(): string {
        return this.state.getName();
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
        if (this.isThreadBased()){
            return;
        }
        return this.asMonitor().addAsyncReaction(def);
    }

    addDataReaction(def: DataReactionDef<DATA>): DataReactionLock {
        return this.state.addReaction(def);
    }

    get do(): ACTIONS & DefaultActionsFn<DATA> {
        return this.state.do;
    }

    start(): this {
        this.state.start();
        return this;
    }

    stop(eventsConsumer: (events) => void): this {
        this.state.stop(eventsConsumer);
        return this;
    }

    get actions (): ACTIONS & DefaultActionsFn<DATA>{
        return this.state.actions as any;
    }

    getData(): DATA {
        return this.state.getData();
    }

    asyncMerge<T>(
        baseValue: T,
        monitorMerger: (ITriFunction<MonitorInfo, DATA, T, T>),
        dataMerger: ITriFunction<DATA, MonitorInfo, T, T>
    ): ConanState<T, ACTIONS> {
        if (this.isThreadBased()){
            throw new Error(`this conan state is not ready for async`);
        }

        let mergedThread: Thread<T> = Pipes.fromMonitor<DATA, T>(
            this.state as any,
            monitorMerger,
            dataMerger, {
                initialData: baseValue
            }
        );

        return new ConanState<T, ACTIONS>(
            new ThreadFacade<T, {}, ACTIONS>(
                mergedThread,
                this.actions
            )
        );
    }

    filter(mapper: (current: DATA, previous: DATA) => boolean): ConanState<DATA> {
        let state: ThreadFacade<DATA> = Pipes.filter<DATA>(
            `filter=>${this.getName()}`,
            this.isThreadBased() ? this.asThread() as any : this.asMonitor().mainThread,
            mapper
        );
        return new ConanState<DATA>(
            state as any
        );
    }

    map<T>(mapper: IFunction<DATA, T>): ConanState<T> {
        let state: ThreadFacade<T> = Pipes.map<DATA, T>(
            `map=>${this.getName()}`,
            this.isThreadBased() ? this.asThread() as any : this.asMonitor().mainThread,
            mapper
        );
        return new ConanState<T>(
            state as any
        );
    }

    merge<T, TO_MERGE>(
        toMerge$: ConanState<TO_MERGE, any>,
        merger: ITriFunction<DATA, TO_MERGE, T, T>
    ): ConanState<T>  {
        let state: ThreadFacade<T> = Pipes.merge<DATA, TO_MERGE, T>(
            `merge=>${this.getName()}`,
            this.isThreadBased() ? this.asThread() as any : this.asMonitor().mainThread,
            merger,
            toMerge$.asThread(),
            (right, left, current)=>merger(left, right, current)
        );
        return new ConanState<T>(
            state as any
        );
    }

    tuple<TO_MERGE>(
        toMerge$: ConanState<TO_MERGE, any>,
    ): ConanState<[DATA, TO_MERGE]>  {
        let state: ThreadFacade<[DATA, TO_MERGE]> = Pipes.tupleCombine<DATA, TO_MERGE>(
            `mergeTuple=>${this.getName()}`,
            this.isThreadBased() ? this.asThread() as any : this.asMonitor().mainThread,
            toMerge$.asThread(),
        );
        return new ConanState<[DATA, TO_MERGE]>(
            state as any
        );
    }


    private isThreadBased (){
        return !this.isMonitorBased();
    }

    private isMonitorBased (){
        return this.state instanceof MonitorFacade;
    }

    public asThread (): ThreadFacade<DATA, any, ACTIONS>{
        if (this.isThreadBased()) {
            return this.state as ThreadFacade<DATA, any, ACTIONS>;
        }

        return this.asMonitor().mainThread;
    }

    private asMonitor (): MonitorFacade<DATA, any, ACTIONS>{
        return this.state as MonitorFacade<DATA, any, ACTIONS>;
    }

    static combine<T extends {}, ACTIONS = void>(
        name: string,
        fromState: {[KEY in keyof T]: ConanState<T[KEY], any>},
        pipeThreadDef ?: PipeThreadDef<T, {}, ACTIONS>
    ) : ConanState<T, ACTIONS>{
        let threadFacade = Pipes.combine<T, ACTIONS>(
            name,
            Objects.mapKeys<ConanState<any>, ThreadFacade<any, any, any>>(fromState, conanState=>conanState.asThread()) as any,
            pipeThreadDef
        );
        return new ConanState<T, ACTIONS>(threadFacade);
    }
}
