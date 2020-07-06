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
import {FlowEventNature, FlowEventType} from "../../conan-flow/domain/flowRuntimeEvents";
import {FlowRuntimeTracker} from "../../conan-flow/logic/flowRuntimeTracker";
import {StateDef} from "../domain/stateDef";

export interface Thread<DATA, REDUCERS extends Reducers<DATA> = {}> {
    isRunning: boolean;

    reducers: REDUCERS & DefaultStepFn<DATA>;

    getData(): DATA;

    start(): this;

    next(cb: (onNext: Context<ThreadFlow<DATA>, 'nextData', { nextData: REDUCERS }>) => void): void;

    stop(eventsConsumer: (events) => void): void;

    addReaction(def: DataReactionDef<DATA>): DataReactionLock;

    addReactionNext(def: DataReactionDef<DATA>): this;

    chain(
        operation: IConsumer<REDUCERS>,
        name?: string
    ): Asap<DATA>;

    monitor<T>(
        toMonitor: Asap<T>,
        thenCallback: IBiConsumer<T, REDUCERS & DefaultStepFn<T>>,
        name?: string,
        payload?: any
    ): Asap<DATA>;

    getEvents(): FlowEventsTracker<{ nextData: DATA}>

    stop(eventsConsumer: (events) => void): void;

    getName(): string;

    changeLoggingNature(nature: FlowEventNature): void;

    log(msg: string): void;

    once(reaction: IConsumer<DATA>, name?: string): this;

    createRuntimeTracker(
        runtimeEvent: FlowEventType,
        payload?: any
    ): FlowRuntimeTracker;
}

export class ThreadImpl<DATA, REDUCERS extends Reducers<DATA> = {}> implements Thread<DATA, REDUCERS> {
    constructor(
        private readonly flow: Flow<ThreadFlow<DATA>, {nextData:REDUCERS}>,
        private readonly def: StateDef<DATA, REDUCERS, any>,
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
        mutatorsCb: IConsumer<REDUCERS & DefaultStepFn<DATA>>,
        name?: string
    ): Asap<DATA> {
        return this.flow.chainInto('nextData', 'nextData', mutatorsCb, name).map<DATA>(context=>context.getData())
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

    changeLoggingNature(nature: FlowEventNature) {
        this.flow.changeLoggingNature (nature);
    }

    log(msg: string): void {
        this.flow.log(msg)
    }

    once(reaction: IConsumer<DATA>, name?: string): this {
        this.flow.onceOn('nextData', onNextData=>reaction(onNextData.getData()), name)
        return this;
    }

    createRuntimeTracker(runtimeEvent: FlowEventType, payload?: any): FlowRuntimeTracker {
        return this.flow.createRuntimeTracker(runtimeEvent, payload);
    }

    addReactionNext(def: DataReactionDef<DATA>): this {
        this.flow.addReactionNext (
            this.flow.on('nextData') as any,
            {
                name: def.name,
                reactionType: ReactionType.ALWAYS,
                action: (onNextData)=> def.dataConsumer (onNextData.getData())
            }
        );
        return this;
    }

    getDefinition <ACTIONS>(): StateDef<DATA, REDUCERS, ACTIONS>{
        return this.def;
    }
}
