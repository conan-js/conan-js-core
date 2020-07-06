import {Reducers} from "../../conan-thread/domain/reducers";
import {Monitor, MonitorImpl} from "../logic/monitorImpl";
import {DataReactionDef, DataReactionLock} from "../../conan-thread/domain/dataReaction";
import {MonitorInfo} from "./monitorInfo";
import {DefaultStepFn} from "../../conan-flow/domain/steps";
import {FlowEventsTracker} from "../../conan-flow/logic/flowEventsTracker";
import {Context} from "../../conan-flow/domain/context";
import {ThreadFlow} from "../../conan-thread/factories/threads";
import {ThreadFacade} from "../../conan-thread/domain/threadFacade";
import {MonitorActions} from "./monitorActions";
import {FlowEventNature} from "../../conan-flow/domain/flowRuntimeEvents";
import {FlowFacade} from "../../conan-flow/domain/flowFacade";
import {MetaMutators, MetaStatuses} from "./metaFlow";
import {Asap, IConsumer} from "../..";

export class MonitorFacade<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = any> implements Monitor<DATA, REDUCERS, ACTIONS>{
    constructor(
        private readonly monitor: MonitorImpl<DATA, REDUCERS, ACTIONS>,
        public readonly actions: ACTIONS
    ) {}

    start(): this {
        this.monitor.start();
        return this;
    }

    addAsyncReaction(def: DataReactionDef<MonitorInfo>): DataReactionLock {
        return this.monitor.addAsyncReaction(def);
    }

    addReaction(def: DataReactionDef<DATA>): DataReactionLock {
        return this.monitor.addReaction(def);
    }

    once(reaction: IConsumer<DATA>, name?: string): this {
        this.monitor.once(reaction, name);
        return this;
    }

    get do (): REDUCERS & DefaultStepFn<DATA> & ACTIONS{
        return this.monitor.do
    }

    getEvents(): FlowEventsTracker<{ nextData: DATA }> {
        return this.monitor.getEvents();
    }

    getName(): string {
        return this.monitor.getName();
    }

    stop(eventsConsumer?: (events) => void): void {
        this.monitor.stop(eventsConsumer);
    }

    getData(): DATA {
        return this.monitor.getData();
    }

    next(cb: (onNext: Context<ThreadFlow<DATA>, "nextData", { nextData: REDUCERS }>) => void) {
        this.monitor.next(cb);
    }

    get asyncThread (): ThreadFacade<MonitorInfo, {}, MonitorActions> {
        return this.monitor.asyncThread;
    }

    get mainThread (): ThreadFacade<DATA, REDUCERS, ACTIONS> {
        return this.monitor.mainThread;
    }

    get metaFlow (): FlowFacade<MetaStatuses, MetaMutators> {
        return this.monitor.metaFlow;
    }

    chain(operation: IConsumer<REDUCERS>, name?: string): Asap<DATA> {
        return this.monitor.mainThread.chain(operation, name);
    }

    transaction (code: IConsumer<ACTIONS>): Asap<DATA> {
        return this.monitor.transaction(code);
    }

    openTransaction(name?: string): void {
        this.monitor.openTransaction(name);
    }

    closeTransaction(callback?: IConsumer<DATA>) {
        this.monitor.closeTransaction(callback);
    }
}
