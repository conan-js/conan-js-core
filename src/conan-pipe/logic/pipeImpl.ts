import {ThreadFacade} from "../../conan-thread/domain/threadFacade";
import {Asap, IConsumer, Reducers} from "../..";
import {Thread} from "../../conan-thread/logic/thread";
import {DataReactionDef, DataReactionLock} from "../../conan-thread/domain/dataReaction";
import {FlowEventsTracker} from "../../conan-flow/logic/flowEventsTracker";
import {Context} from "../../conan-flow/domain/context";
import {ThreadFlow, Threads} from "../../conan-thread/factories/threads";
import {DefaultStepFn} from "../../conan-flow/domain/steps";
import {DefaultActionsFn} from "../../conan-flow/domain/actions";
import {PipeThreadDef} from "../domain/pipeThreadDef";

export class PipeImpl<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = void> implements ThreadFacade<DATA, REDUCERS, ACTIONS>{
    private baseThread: ThreadFacade<DATA, REDUCERS, ACTIONS>;

    constructor(
        private readonly name: string,
        private readonly pipeConnector: IConsumer<ThreadFacade<DATA, REDUCERS, ACTIONS>>,
        private readonly pipeThreadDef?: PipeThreadDef<DATA, REDUCERS, ACTIONS>
    ) {}

    addReaction(def: DataReactionDef<DATA>): DataReactionLock {
        return this.baseThread.addReaction(def);
    }

    chain(mutatorsCb: IConsumer<REDUCERS>): Asap<DATA> {
        return this.baseThread.chain(mutatorsCb);
    }

    getData(): DATA {
        return this.baseThread.getData();
    }

    getEvents(): FlowEventsTracker<{ nextData: DATA }> {
        return this.baseThread.getEvents();
    }

    getName(): string {
        return this.baseThread.getName();
    }

    next(cb: (onNext: Context<ThreadFlow<DATA>, "nextData", { nextData: REDUCERS }>) => void): void {
        this.baseThread.next(cb);
    }

    start(): this {
        if (this.baseThread == null){

            let def = {
                name: this.name,
                ...this.pipeThreadDef,
            };
            this.baseThread = Threads.create<DATA, REDUCERS, ACTIONS>(def);
            this.pipeConnector(this.baseThread);
        } else {
            this.baseThread.start();
        }

        return this;
    }

    stop(eventsConsumer: (events) => void): this {
        this.baseThread.stop(undefined);
        return this;
    }

    get reducers (): REDUCERS & DefaultStepFn<DATA> {
        return this.baseThread.reducers;
    }

    get isRunning (): boolean {
        return this.baseThread.isRunning;
    }

    get do(): DefaultActionsFn<DATA> & ACTIONS & DefaultStepFn<DATA> & REDUCERS{
        return this.baseThread.do;
    }

    get actions(): ACTIONS {
        return this.baseThread.actions;
    }

    get thread(): Thread<DATA, REDUCERS> {
        return this.baseThread.thread;
    }

}
