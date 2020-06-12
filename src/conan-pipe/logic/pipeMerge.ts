import {Thread} from "../../conan-thread/logic/thread";
import {ThreadFlow, Threads} from "../../conan-thread/factories/threads";
import {DataReactionDef, DataReactionLock} from "../../conan-thread/domain/dataReaction";
import {IConsumer} from "../..";
import {Asap} from "../../conan-utils/asap";
import {FlowEventsTracker} from "../../conan-flow/logic/flowEventsTracker";
import {Context} from "../../conan-flow/domain/context";
import {DefaultStepFn} from "../../conan-flow/domain/steps";
import {ITriFunction} from "../../conan-utils/typesHelper";

export class PipeMerge<LEFT, RIGHT, MERGED> implements Thread<MERGED>{
    isRunning: boolean;

    private baseThread: Thread<MERGED>;

    private lastLeftData: LEFT;
    private lastRightData: RIGHT;

    constructor(
        private readonly name: string,
        private readonly base: MERGED,
        private readonly leftThread: Thread<LEFT>,
        private readonly leftMapper: ITriFunction<LEFT, RIGHT, MERGED, MERGED>,
        private readonly rightThread: Thread<RIGHT>,
        private readonly rightMapper: ITriFunction<RIGHT, LEFT, MERGED, MERGED>,
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
            this.baseThread = Threads.create<MERGED>({
                name: this.name,
                initialData: this.base
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

    stop(eventsConsumer: (events) => void): void {
        this.baseThread.stop(undefined);
    }

    get reducers (): DefaultStepFn<MERGED> {
        return this.baseThread.reducers;
    }

}
