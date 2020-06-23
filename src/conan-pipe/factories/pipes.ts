import {Thread} from "../../conan-thread/logic/thread";
import {MonitorFacade} from "../../conan-monitor/domain/monitorFacade";
import {IFunction} from "../..";
import {MonitorInfo} from "../../conan-monitor/domain/monitorInfo";
import {Objects} from "../../conan-utils/objects";
import {PipeThreadDef} from "../domain/pipeThreadDef";
import {ThreadFacade} from "../../conan-thread/domain/threadFacade";
import {PipeImpl} from "../logic/pipeImpl";
import {Threads} from "../../conan-thread/factories/threads";
import {ITriFunction} from "../../conan-utils/typesHelper";
import {FlowEventNature} from "../../conan-flow/domain/flowRuntimeEvents";

export class Pipes {
    static fromMonitor<FROM, INTO, ACTIONS = void> (
        name: string,
        monitor: MonitorFacade<FROM>,
        monitorMerger: (ITriFunction<MonitorInfo, FROM, INTO, INTO>),
        dataMerger: ITriFunction<FROM, MonitorInfo, INTO, INTO>,
        pipeThreadDef ?: PipeThreadDef<INTO, {}, ACTIONS>
    ): ThreadFacade<INTO, {}, ACTIONS>{
        return Pipes.filter(
            name,
            Pipes.merge<MonitorInfo, FROM, INTO, ACTIONS>(
                name,
                monitor.asyncThread,
                monitorMerger,
                monitor.mainThread,
                dataMerger,
                pipeThreadDef
            ),
            (current, previous)=> !Objects.deepEquals(current, previous),
            {
                nature: FlowEventNature.AUX
            }
        );
    }

    static map<SRC, TARGET, ACTIONS = void>(
        name: string,
        src$: ThreadFacade<SRC>,
        mapper: IFunction<SRC, TARGET>,
        pipeThreadDef ?: PipeThreadDef<TARGET, {}, ACTIONS>
    ): ThreadFacade<TARGET, {}, ACTIONS>{
        return new PipeImpl<TARGET, {}, ACTIONS>(
            name,
            thread=> src$.addReaction({
                name: `mapper`,
                dataConsumer: (data)=>thread.do.update(mapper(data))
            }),
            pipeThreadDef
        ).start();
    }

    static merge <LEFT, RIGHT, INTO, ACTIONS = void> (
        name: string,
        left$: Thread<LEFT>,
        leftMerger: (ITriFunction<LEFT, RIGHT, INTO, INTO>),
        right$: Thread<RIGHT>,
        rightMerger: (ITriFunction<RIGHT, LEFT, INTO, INTO>),
        pipeThreadDef ?: PipeThreadDef<INTO, {}, ACTIONS>
    ): ThreadFacade<INTO, {}, ACTIONS>{
        let statesHistory$ = Threads.create<INTO>({name: 'last states', nature: FlowEventNature.AUX});
        let leftHistory$ = Threads.create<LEFT>({name: 'last states', nature: FlowEventNature.AUX});
        let rightHistory$ = Threads.create<RIGHT>({name: 'last states', nature: FlowEventNature.AUX});

        return new PipeImpl<INTO, {}, ACTIONS>(
            name,
            thread=>{
                thread.addReaction({
                    name: `append state`,
                    dataConsumer: (data)=>statesHistory$.do.update(data)
                });
                [
                    [left$, leftMerger, leftHistory$, rightHistory$],
                    [right$, rightMerger, rightHistory$, leftHistory$],
                ].forEach(toConnect=>{
                    let state$: Thread<LEFT | RIGHT> = toConnect[0] as any;
                    let mapper: ITriFunction<LEFT | RIGHT, LEFT | RIGHT, INTO, INTO> = toConnect[1] as any;
                    let thisHistory$: Thread<LEFT | RIGHT> = toConnect[2] as any;
                    let oppositeHistory$: Thread<LEFT | RIGHT> = toConnect[3] as any;

                    state$.addReaction({
                        name: `merge`,
                        dataConsumer: (data)=>{
                            thisHistory$.reducers.$update(data);
                            thread.do.update(mapper(
                                data,
                                oppositeHistory$.getData(),
                                statesHistory$.getData()
                            ));
                        }
                    })
                })
            },
            pipeThreadDef
        ).start();

    }

    static tupleCombine <LEFT, RIGHT, ACTIONS = void> (
        name: string,
        left$: Thread<LEFT>,
        right$: Thread<RIGHT>,
        pipeThreadDef ?: PipeThreadDef<[LEFT, RIGHT], {}, ACTIONS>
    ): ThreadFacade<[LEFT, RIGHT], {}, ACTIONS>{
        let leftHistory$ = Threads.create<LEFT>({name: 'last states', nature: FlowEventNature.AUX});
        let rightHistory$ = Threads.create<RIGHT>({name: 'last states', nature: FlowEventNature.AUX});

        return new PipeImpl<[LEFT, RIGHT], {}, ACTIONS>(
            `combineArray => [${left$.getName()}, ${right$.getName()}]`,
            thread=>{
                thread.addReaction({
                    name: name,
                    dataConsumer: (data)=>{
                        leftHistory$.do.update (data[0]);
                        rightHistory$.do.update (data[1]);
                    }
                });
                [
                    [left$, rightHistory$, 'left'],
                    [right$, leftHistory$, 'right'],
                ].forEach(toProcess=>{
                    let state$: Thread<LEFT | RIGHT> = toProcess[0] as any;
                    let oppositeHistory$: Thread<LEFT | RIGHT> = toProcess[1] as any;
                    let currentlyProcessing = toProcess[2];

                    state$.addReaction({
                        name: `tuple=>${currentlyProcessing}`,
                        dataConsumer: (data)=>{
                            let newValue: [LEFT, RIGHT];
                            if (currentlyProcessing === 'left'){
                                let oppositeValue: RIGHT = oppositeHistory$.getData() as RIGHT;
                                let thisValue: LEFT = data as LEFT;
                                newValue = [thisValue, oppositeValue];
                            } else {
                                let oppositeValue: LEFT = oppositeHistory$.getData() as LEFT;
                                let thisValue: RIGHT = data as RIGHT;
                                newValue = [oppositeValue, thisValue];
                            }
                            thread.do.update (newValue);
                        }
                    })

                })
            },
            pipeThreadDef
        ).start();
    }

    static combine<T extends {}, ACTIONS = void>(
        name: string,
        fromState: {[KEY in keyof T]: ThreadFacade<T[KEY], any, any>},
        pipeThreadDef ?: PipeThreadDef<T, {}, ACTIONS>
    ) : ThreadFacade<T, {}, ACTIONS>{
        return new PipeImpl<T, {}, ACTIONS>(
            name,
            (thread) => Objects.foreachEntry<ThreadFacade<any>>(fromState, (threadFrom, key)=>
                threadFrom.addReaction({
                    name: `combine`,
                    dataConsumer: (data) => {
                        thread.reducers.$update(
                            (current) => {
                                return {
                                    ...current,
                                    [key]: data
                                };
                            }
                        );
                    }
                })
            ),
            pipeThreadDef
        ).start();
    }

    static filter<T, ACTIONS = void>(
        name: string,
        toFilter$: ThreadFacade<T, {}, ACTIONS>,
        predicate: (current: T, previous: T) => boolean,
        pipeThreadDef ?: PipeThreadDef<T, {}, ACTIONS>
    ): ThreadFacade<T, {}, ACTIONS> {
        let statesHistory$ = Threads.create<T>({name: 'last states', nature: FlowEventNature.AUX});

        return new PipeImpl<T, {}, ACTIONS>(
            name,
            (thread) => {
                thread.addReaction({
                    name: `save state`,
                    dataConsumer: (data)=>statesHistory$.reducers.$update(data)
                });
                toFilter$.addReaction({
                    name: `pipe-filter`,
                    dataConsumer: (toFilter) => {
                        let previousState = statesHistory$.getData();
                        if (predicate(toFilter, previousState)) {
                            thread.reducers.$update(toFilter);
                        }
                    },
                })
            },
            pipeThreadDef
        ).start();
    }
}
