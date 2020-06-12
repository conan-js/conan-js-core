import * as React from "react";
import {ReactElement} from "react";
import {DataReactionDef, DataReactionLock} from "../conan-thread/domain/dataReaction";
import {ConnectedState, StateConnect, StateMapConnect} from "./connect/stateConnect";
import {IBiFunction} from "..";
import {StateLive} from "./live/stateLive";
import {DefaultActionsFn} from "../conan-flow/domain/actions";
import {MonitorFacade} from "../conan-monitor/domain/monitorFacade";
import {Pipes} from "../conan-pipe/factories/factories";
import {MonitorInfo} from "../conan-monitor/domain/monitorInfo";
import {Thread} from "../conan-thread/logic/thread";
import {ThreadFacade} from "../conan-thread/domain/threadFacade";

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

    addAsyncReaction(def: DataReactionDef<DATA>): DataReactionLock {
        if (this.state instanceof ThreadFacade){
            return;
        }
        return this.state.addAsyncReaction(def);
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
        monitorMerger: (IBiFunction<MonitorInfo, T, T>),
        dataMerger: IBiFunction<DATA, T, T>
    ): ConanState<T, ACTIONS> {
        if (this.state instanceof ThreadFacade){
            throw new Error(`this conan state is not ready for async`);
        }

        let mergedThread: Thread<T> = Pipes.fromMonitor<DATA, T>(
            this.state as any,
            baseValue,
            monitorMerger,
            dataMerger
        );

        return new ConanState<T, ACTIONS>(
            new ThreadFacade<T, {}, ACTIONS>(
                mergedThread,
                this.actions
            )
        );
    }
}
