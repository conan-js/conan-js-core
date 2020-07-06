import {ThreadFacade} from "../../conan-thread/domain/threadFacade";
import {Reducers} from "../../conan-thread/domain/reducers";
import {MonitorActions} from "../domain/monitorActions";
import {DataReactionDef, DataReactionLock} from "../../conan-thread/domain/dataReaction";
import {MonitorInfo, MonitorStatus} from "../domain/monitorInfo";
import {DefaultStepFn} from "../../conan-flow/domain/steps";
import {FlowEventsTracker} from "../../conan-flow/logic/flowEventsTracker";
import {Context} from "../../conan-flow/domain/context";
import {ThreadFlow} from "../../conan-thread/factories/threads";
import {FlowFacade} from "../../conan-flow/domain/flowFacade";
import {MetaMutators, MetaStatuses} from "../domain/metaFlow";
import {Asap, Asaps, ConanState, IConsumer} from "../../index";
import {FlowEventNature, FlowEventType} from "../../conan-flow/domain/flowRuntimeEvents";
import {Pipes} from "../../conan-pipe/factories/pipes";
import {MetaInfo, MetaStatus} from "../domain/metaInfo";
import {FlowRuntimeTracker} from "../../conan-flow/logic/flowRuntimeTracker";
import {ConanFlow} from "../../conan-react/conanFlow";


export interface Monitor<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = any> {
    transaction (code: IConsumer<ACTIONS>): Asap<DATA>;

    mainThread: ThreadFacade<DATA, REDUCERS, ACTIONS>;

    asyncThread: ThreadFacade<MonitorInfo, {}, MonitorActions>;

    metaFlow: FlowFacade<MetaStatuses, MetaMutators>;

    start(): this;

    addReaction(def: DataReactionDef<DATA>): DataReactionLock;

    once(reaction: IConsumer<DATA>, name: string): this;

    addAsyncReaction(def: DataReactionDef<DATA>): DataReactionLock;

    do: REDUCERS & DefaultStepFn<DATA> & ACTIONS;

    getEvents(): FlowEventsTracker<{ nextData: DATA }>

    next(cb: (onNext: Context<ThreadFlow<DATA>, 'nextData', { nextData: REDUCERS }>) => void): void;

    getName(): string;

    stop(eventsConsumer: (events) => void): void;

    stop(eventsConsumer: (events) => void): void;

    getData(): DATA;

    chain(
        operation: IConsumer<REDUCERS>,
        name?: string
    ): Asap<DATA>;

    openTransaction (name?: string): void;

    closeTransaction (callback?: IConsumer<DATA>): void;
}

export class MonitorImpl<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = any> implements Monitor<DATA, REDUCERS, ACTIONS> {
    private currentTransaction: FlowRuntimeTracker;

    constructor(
        public readonly mainThread: ThreadFacade<DATA, REDUCERS, ACTIONS>,
        public readonly asyncThread: ThreadFacade<MonitorInfo, {}, MonitorActions>,
        public readonly metaFlow: FlowFacade<MetaStatuses, MetaMutators>,
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

    once(reaction: IConsumer<DATA>, name?: string): this  {
        this.mainThread.once(reaction, name);
        return this;
    }

    chain(operation: IConsumer<REDUCERS>, name?: string): Asap<DATA> {
        return this.mainThread.chain(operation, name)
    }

    openTransaction (name?: string): void{
        if (this.currentTransaction == null) {
            this.currentTransaction = this.mainThread.createRuntimeTracker(
                FlowEventType.MONITOR_TRANSACTION,
            ).start( );
            this.currentTransaction.info(`starting transaction: ${name == null ? `[anonymous]`: name}`)
        }
    }

    closeTransaction (callback?: IConsumer<DATA>): void{
        let metaFlowStatuses$: ConanState<MetaInfo> = new ConanFlow(this.metaFlow).toStateAll().map(it=>it.data);


        let unlockTupleNow: boolean = false;
        let unlockThreadNow: boolean = false;


        let tupleLock = undefined;
        tupleLock = Pipes.tupleCombine<MonitorInfo, MetaInfo>(
            'idleChecker',
            this.asyncThread,
            metaFlowStatuses$.mainThread,
            {
                nature: FlowEventNature.AUX
            }
        ).addReaction({
            name: `wait for both idle`,
            dataConsumer: ([monitorInfo, metaInfo])=> {
                if (monitorInfo.status === MonitorStatus.IDLE && (
                    metaInfo.status === MetaStatus.IDLE_ON_TRANSACTION ||
                    metaInfo.status === MetaStatus.IDLE)
                ) {
                    let mainThreadLock: DataReactionLock = undefined;
                    mainThreadLock = this.mainThread.addReaction({
                        name: 'wait for both idle',
                        dataConsumer: (data) => {
                            this.currentTransaction.info(`finishing transaction`);
                            this.currentTransaction.end();
                            this.currentTransaction = null;
                            if (mainThreadLock) {
                                mainThreadLock.release();
                            } else {
                                unlockThreadNow = true;
                            }
                            if (tupleLock) {
                                tupleLock.release();
                            } else {
                                unlockTupleNow = true;
                            }
                            if (callback) {
                                callback(data);
                            }
                        }
                    });
                    if (unlockThreadNow){
                        mainThreadLock.release();
                    }
                }
            }
        });

        if (unlockTupleNow){
            tupleLock.release();
        }

    }

    transaction(code: IConsumer<ACTIONS>, name?: string): Asap<DATA> {
        let [next,asap] = Asaps.next<DATA>(`transaction[${name}]`)
        this.openTransaction();
        code(this.do);
        this.closeTransaction(data=>next(data))
        return asap;
    }
}
