import {Thread} from "../../conan-thread/logic/thread";
import {MonitorFacade} from "../../conan-monitor/domain/monitorFacade";
import {IBiFunction} from "../..";
import {MonitorInfo} from "../../conan-monitor/domain/monitorInfo";
import {PipeMerge} from "../logic/pipeMerge";
import {PipeFilter} from "../logic/pipeFilter";
import {Objects} from "../../conan-utils/objects";
import {PipeThreadDef} from "../domain/pipeThreadDef";
import {ThreadFacade} from "../../conan-thread/domain/threadFacade";

export class Pipes {
    static fromMonitor<FROM, INTO> (
        monitor: MonitorFacade<FROM>,
        baseValue: INTO,
        monitorMerger: (IBiFunction<MonitorInfo, INTO, INTO>),
        dataMerger: IBiFunction<FROM, INTO, INTO>
    ): Thread<INTO>{
        let pipeMerge = new PipeMerge<FROM, MonitorInfo, INTO> (
            `pipeMonitorRaw[${monitor.getName()}]`,
            baseValue,
            monitor.mainThread,
            (data, monitorInfo, into)=>dataMerger(data, into),
            monitor.asyncThread,
            (monitorInfo, data, into) => monitorMerger(monitorInfo, into),
        );
        pipeMerge.start();
        return new PipeFilter <INTO>(
            pipeMerge,
            (current, previous)=> !Objects.deepEquals(current, previous),
            `pipeMonitor[${monitor.getName()}]`,
            baseValue
        ).start();
    }

    static tupleCombine <LEFT, RIGHT, ACTIONS = void> (
        left: Thread<LEFT>,
        right: Thread<RIGHT>,
        baseValue: [LEFT, RIGHT],
        pipeThreadDef ?: PipeThreadDef<[LEFT, RIGHT], ACTIONS>
    ): ThreadFacade<[LEFT, RIGHT], {}, ACTIONS>{
        return new PipeMerge<LEFT, RIGHT, [LEFT, RIGHT], ACTIONS>(
            `combineArray => [${left.getName()}, ${right.getName()}]`,
            baseValue,
            left,
            (left, right, into) => [left, into[1]],
            right,
            (right, left, into) => [into[0], right],
            pipeThreadDef
        ).start();
    }
}
