import {Thread} from "../logic/thread";
import {DefaultStepFn} from "../../conan-flow/domain/steps";
import {Reducers} from "./reducers";
import {IConsumer} from "../..";
import {Context} from "../../conan-flow/domain/context";
import {ThreadFlow} from "../factories/threads";
import {Asap} from "../../conan-utils/asap";
import {DataReactionDef, DataReactionLock} from "./dataReaction";
import {FlowEventsTracker} from "../../conan-flow/logic/flowEventsTracker";
import {DefaultActionsFn} from "../../conan-flow/domain/actions";
import {FlowEventNature} from "../../conan-flow/domain/flowRuntimeEvents";

export class ThreadFacade<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = void> implements Thread<DATA, REDUCERS>{
    constructor(
        readonly thread: Thread<DATA, REDUCERS>,
        public readonly actions: ACTIONS,
    ) {}

    chain(mutatorsCb: IConsumer<REDUCERS>): Asap<DATA> {
        this.thread.chain(mutatorsCb);
        return undefined;
    }

    next(cb: (onNumberUpdated: Context<ThreadFlow<DATA>, "nextData", { nextData: REDUCERS }>) => void): void {
        this.thread.next(cb);
    }

    start(): this {
        this.thread.start();
        return this;
    }

    stop(eventsConsumer: (events) => void): this {
        this.thread.stop(eventsConsumer);
        return this;
    }

    get do (): REDUCERS & DefaultActionsFn<DATA> & ACTIONS & DefaultStepFn<DATA>{
        let steps: REDUCERS & DefaultStepFn<DATA> = this.reducers;
        return {
            ...steps,
            ...this.actions as any
        };
    }

    get reducers (): REDUCERS & DefaultStepFn<DATA>{
        return this.thread.reducers;
    }

    addReaction(def: DataReactionDef<DATA>): DataReactionLock {
        return this.thread.addReaction(def);
    }

    get isRunning (): boolean{
        return this.thread.isRunning;
    }

    getData(): DATA {
        return this.thread.getData();
    }

    getEvents(): FlowEventsTracker<{ nextData: DATA }> {
        return this.thread.getEvents();
    }

    getName(): string {
        return this.thread.getName();
    }

    changeLoggingNature(nature: FlowEventNature) {
        this.thread.changeLoggingNature(nature);
    }
}
