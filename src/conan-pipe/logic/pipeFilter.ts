import {Thread} from "../../conan-thread/logic/thread";
import {DataReactionDef, DataReactionLock} from "../../conan-thread/domain/dataReaction";
import {IBiFunction, IConsumer} from "../..";
import {Asap} from "../../conan-utils/asap";
import {FlowEventsTracker} from "../../conan-flow/logic/flowEventsTracker";
import {Context} from "../../conan-flow/domain/context";
import {ThreadFlow, Threads} from "../../conan-thread/factories/threads";
import {DefaultStepFn} from "../../conan-flow/domain/steps";

export class PipeFilter<DATA> implements Thread<DATA>{
    private baseThread: Thread<DATA>;
    private lastState: DATA;

    constructor(
        private readonly fromThread: Thread<DATA>,
        private readonly filter: IBiFunction<DATA, DATA, boolean>,
        private readonly name: string,
        private readonly base: DATA,
    ) {
    }

    addReaction(def: DataReactionDef<DATA>): DataReactionLock {
        return this.baseThread.addReaction(def);
    }

    chain(mutatorsCb: IConsumer<{}>): Asap<DATA> {
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

    next(cb: (onNext: Context<ThreadFlow<DATA>, "nextData", { nextData: {} }>) => void): void {
        this.baseThread.next(cb);
    }

    start(): this {
        if (this.baseThread == null){
            this.baseThread = Threads.create<DATA>({
                name: this.name,
                initialData: this.base
            });

            this.fromThread.addReaction({
                name: undefined,
                dataConsumer: (data)=> {
                    if (this.filter(data, this.lastState)){
                        this.lastState = data;
                        this.reducers.$update(data);
                    }
                },
            });

        } else {
            this.baseThread.start();
        }

        return this;
    }

    stop(eventsConsumer: (events) => void): void {
        this.baseThread.stop(undefined);
    }

    get reducers (): DefaultStepFn<DATA> {
        return this.baseThread.reducers;
    }

    get isRunning (): boolean {
        return this.baseThread.isRunning;
    }
}
