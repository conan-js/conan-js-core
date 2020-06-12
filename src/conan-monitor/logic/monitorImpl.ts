import {ThreadFacade} from "../../conan-thread/domain/threadFacade";
import {Reducers} from "../../conan-thread/domain/reducers";
import {MonitorActions} from "../domain/monitorActions";
import {DataReactionDef, DataReactionLock} from "../../conan-thread/domain/dataReaction";
import {MonitorInfo} from "../domain/monitorInfo";
import {DefaultStepFn} from "../../conan-flow/domain/steps";
import {FlowEventsTracker} from "../../conan-flow/logic/flowEventsTracker";
import {Context} from "../../conan-flow/domain/context";
import {ThreadFlow} from "../../conan-thread/factories/threads";


export interface Monitor<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = any> {
    mainThread: ThreadFacade<DATA, REDUCERS, ACTIONS>;

    asyncThread: ThreadFacade<MonitorInfo, {}, MonitorActions>;

    start(): this;

    addReaction(def: DataReactionDef<DATA>): DataReactionLock;

    addAsyncReaction(def: DataReactionDef<DATA>): DataReactionLock;

    do: REDUCERS & DefaultStepFn<DATA> & ACTIONS;

    getEvents(): FlowEventsTracker<{ nextData: DATA }>

    next(cb: (onNext: Context<ThreadFlow<DATA>, 'nextData', { nextData: REDUCERS }>) => void): void;

    getName(): string;

    stop(eventsConsumer: (events) => void): void;

    stop(eventsConsumer: (events) => void): void;

    getData(): DATA;
}

export class MonitorImpl<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = any> implements Monitor<DATA, REDUCERS, ACTIONS> {
    constructor(
        public readonly mainThread: ThreadFacade<DATA, REDUCERS, ACTIONS>,
        public readonly asyncThread: ThreadFacade<MonitorInfo, {}, MonitorActions>
    ) {
    }

    start(): this {
        this.mainThread.start();
        return this;
    }

    addReaction(def: DataReactionDef<DATA>): DataReactionLock {
        return this.mainThread.addReaction(def);
    }

    addAsyncReaction(def: DataReactionDef<MonitorInfo>): DataReactionLock {
        return this.asyncThread.addReaction(def);
    }

    get do(): REDUCERS & DefaultStepFn<DATA> & ACTIONS {
        return this.mainThread.do as any
    }

    getEvents(): FlowEventsTracker<{ nextData: DATA }> {
        return this.mainThread.getEvents();
    }

    getName(): string {
        return this.mainThread.getName();
    }

    stop(eventsConsumer: (events) => void): void {
        this.mainThread.stop(eventsConsumer);
    }

    getData(): DATA {
        return this.mainThread.getData();
    }

    next(cb: (onNumberUpdated: Context<ThreadFlow<DATA>, 'nextData', { nextData: REDUCERS }>) => void) {
        this.mainThread.next(cb);
    }

}
