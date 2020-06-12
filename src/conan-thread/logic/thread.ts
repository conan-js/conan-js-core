import {ThreadFlow} from "../factories/threads";
import {Context} from "../../conan-flow/domain/context";
import {Reducers} from "../domain/reducers";
import {IBiConsumer, IConsumer} from "../..";
import {Flow} from "../../conan-flow/domain/flow";
import {DefaultStepFn} from "../../conan-flow/domain/steps";
import {Asap} from "../../conan-utils/asap";
import {DataReactionDef, DataReactionLock} from "../domain/dataReaction";
import {ReactionDef} from "../../conan-flow/def/reactionDef";
import {ReactionType} from "../../conan-flow/domain/reactions";
import {DeferLike} from "../../conan-flow/domain/defer";
import {FlowEventsTracker} from "../../conan-flow/logic/flowEventsTracker";

export interface Thread<DATA, REDUCERS extends Reducers<DATA> = {}> {
    isRunning: boolean;

    reducers: REDUCERS & DefaultStepFn<DATA>;

    getData(): DATA;

    start(): this;

    next(cb: (onNext: Context<ThreadFlow<DATA>, 'nextData', { nextData: REDUCERS }>) => void): void;

    stop(eventsConsumer: (events) => void): void;

    addReaction(def: DataReactionDef<DATA>): DataReactionLock;

    chain(
        mutatorsCb: IConsumer<REDUCERS>
    ): Asap<DATA>;

    getEvents(): FlowEventsTracker<{ nextData: DATA}>

    stop(eventsConsumer: (events) => void): void;

    getName(): string;
}

export class ThreadImpl<DATA, REDUCERS extends Reducers<DATA> = {}> implements Thread<DATA, REDUCERS> {
    constructor(
        private readonly flow: Flow<ThreadFlow<DATA>, {nextData:REDUCERS}>,
    ) {}

    start(initialData?: DATA): this {
        this.flow.start(initialData ? {name: 'nextData', data: initialData}: undefined);
        return this;
    }

    next(cb: (onNumberUpdated: Context<ThreadFlow<DATA>, 'nextData', { nextData: REDUCERS }>) => void) {
        this.flow.onceOn("nextData", cb);
    }

    stop(eventsConsumer: (events) => void) {
        this.flow.stop(eventsConsumer);
    }

    chain(
        mutatorsCb: IConsumer<REDUCERS & DefaultStepFn<DATA>>
    ): Asap<DATA> {
        return this.flow.chainInto('nextData', 'nextData', mutatorsCb).map<DATA>(context=>context.getData())
    }

    monitor<T>(
        toMonitor: Asap<T>,
        thenCallback: IBiConsumer<T, REDUCERS & DefaultStepFn<T>>,
        name?: string,
        payload?: any
    ): Asap<DATA> {
        let mutatorsCbAsap: Asap<IConsumer<REDUCERS & DefaultStepFn<T>>> = toMonitor.map(data=>reducers=>thenCallback(data, reducers));
        let defer: DeferLike<any> = {
            payload: payload,
            name: name == null ? 'anonymous' : name,
            action: mutatorsCbAsap
        };
        return this.flow.deferInto('nextData', 'nextData', defer).map<DATA>(context=>context.getData())
    }

    get isRunning (): boolean{
        return this.flow.isRunning;
    }

    get reducers (): REDUCERS & DefaultStepFn<DATA>{
        return this.flow.on('nextData').steps as REDUCERS & DefaultStepFn<DATA>;
    }

    addReaction(def: DataReactionDef<DATA>): DataReactionLock {
        let reactionDef: ReactionDef<ThreadFlow<DATA>, 'nextData', {nextData:REDUCERS}> = {
            name: def.name,
            reactionType: ReactionType.ALWAYS,
            action: oNextData => def.dataConsumer (oNextData.getData()),
        }
        this.flow.addReaction('nextData' as any, reactionDef)
        return {
            release:()=> {
                this.flow.removeReaction('nextData', reactionDef);
            }
        };
    }

    getData(): DATA {
        return this.flow.getStatusData() ['nextData'];
    }

    getEvents(): FlowEventsTracker<{ nextData: DATA }> {
        return this.flow.getEvents();
    }

    getName(): string {
        return this.flow.getName();
    }
}
