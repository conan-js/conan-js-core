import {Thread} from "../../conan-thread/logic/thread";
import {ThreadFlow, Threads} from "../../conan-thread/factories/threads";
import {DataReactionDef, DataReactionLock} from "../../conan-thread/domain/dataReaction";
import {IConsumer} from "../..";
import {Asap} from "../../conan-utils/asap";
import {FlowEventsTracker} from "../../conan-flow/logic/flowEventsTracker";
import {Context} from "../../conan-flow/domain/context";
import {DefaultStepFn} from "../../conan-flow/domain/steps";
import {ITriFunction} from "../../conan-utils/typesHelper";
import {ThreadFacade} from "../../conan-thread/domain/threadFacade";
import {DefaultActionsFn} from "../../conan-flow/domain/actions";
import {PipeThreadDef} from "../domain/pipeThreadDef";

export class PipeMerge<LEFT, RIGHT, MERGED, ACTIONS= void> implements ThreadFacade<MERGED, {}, ACTIONS>{
    private baseThread: ThreadFacade<MERGED, {}, ACTIONS>;

    private lastLeftData: LEFT;
    private lastRightData: RIGHT;

    constructor(
        private readonly name: string,
        private readonly base: MERGED,
        private readonly leftThread: Thread<LEFT>,
        private readonly leftMapper: ITriFunction<LEFT, RIGHT, MERGED, MERGED>,
        private readonly rightThread: Thread<RIGHT>,
        private readonly rightMapper: ITriFunction<RIGHT, LEFT, MERGED, MERGED>,
        private readonly pipeThreadDef?: PipeThreadDef<MERGED, ACTIONS>
    ) {
    }

    addReaction(def: DataReactionDef<MERGED>): DataReactionLock {
        return this.baseThread.addReaction(def);
    }

    chain(mutatorsCb: IConsumer<{}>): Asap<MERGED> {
        return this.baseThread.chain(mutatorsCb);
    }

    getData(): MERGED {
        return this.baseThread.getData();
    }

    getEvents(): FlowEventsTracker<{ nextData: MERGED }> {
        return this.baseThread.getEvents();
    }

    getName(): string {
        return this.baseThread.getName();
    }

    next(cb: (onNext: Context<ThreadFlow<MERGED>, "nextData", { nextData: {} }>) => void): void {
        this.baseThread.next(cb);
    }

    start(): this {
        if (this.baseThread == null){
            this.baseThread = Threads.create<MERGED, {}, ACTIONS>({
                name: this.name,
                initialData: this.base,
                ...this.pipeThreadDef
            });

            this.leftThread.addReaction({
                name: undefined,
                dataConsumer: (data)=> {
                    this.lastLeftData = data;
                    this.baseThread.reducers.$update(
                        (current) => {
                            return this.leftMapper(data, this.lastRightData, current);
                        }
                    );
                },
            });

            this.rightThread.addReaction({
                name: undefined,
                dataConsumer: (data)=> {
                    this.lastRightData = data;
                    this.baseThread.reducers.$update(
                        (current) => {
                            return this.rightMapper(data, this.lastLeftData, current);
                        }
                    );
                },
            })
        } else {
            this.baseThread.start();
        }

        return this;
    }

    stop(eventsConsumer: (events) => void): this {
        this.baseThread.stop(undefined);
        return this;
    }

    get reducers (): DefaultStepFn<MERGED> {
        return this.baseThread.reducers;
    }

    get do(): DefaultActionsFn<MERGED> & ACTIONS & DefaultStepFn<MERGED> {
        return this.baseThread.do;
    }

    get isRunning(): boolean {
        return this.baseThread.isRunning;
    }

    get actions(): ACTIONS {
        return this.baseThread.actions;
    }

    get thread(): Thread<MERGED> {
        return this.baseThread.thread;
    }
}
