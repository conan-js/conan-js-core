import {MetaInfo, MetaStatus} from "./metaInfo";
import {Mutator, Mutators} from "../../conan-flow/domain/mutators";
import {Status} from "../../conan-flow/domain/status";
import {IPartial, IProducer} from "../..";
import {FlowEventTiming} from "../../conan-flow/domain/flowRuntimeEvents";

export interface MetaStatuses {
    starting: MetaInfo,
    init: MetaInfo,
    running: MetaInfo,
    idle: MetaInfo,
    idleOnTransaction: MetaInfo,
    error: MetaInfo,
}


export interface MetaMutators extends Mutators<MetaStatuses>{
    starting: MetaTransitions,
    init: MetaTransitions,
    running: MetaTransitions,
    idle: MetaTransitions,
    idleOnTransaction: MetaTransitions,
    error: MetaTransitions,
}

export interface MetaTransitions extends Mutator<MetaStatuses, any>{
    $onTransaction (timing: FlowEventTiming): MetaInfo;
    toInit (): Status<MetaStatuses, 'init'>;
    toRunning (): Status<MetaStatuses, 'running'>;
    toIdle (): Status<MetaStatuses, 'idle'>;
    toError (): Status<MetaStatuses, 'error'>;
}

export interface MetaSteps extends Mutator<MetaStatuses, any>{
    $onTransaction (timing: FlowEventTiming): MetaInfo;
}

export class MetaMutatorsFactory {
    static createTransitions (getStatus: IProducer<MetaInfo>, statusName: keyof MetaStatuses): IPartial<MetaTransitions> {
        return {
            toIdle(): Status<MetaStatuses, "idle" | "idleOnTransaction"> {
                let transactionCount = getStatus().transactionCount;
                return {
                    name: transactionCount === 0 ? "idle" : "idleOnTransaction",
                    data: {
                        status: transactionCount === 0 ? MetaStatus.IDLE: MetaStatus.IDLE_ON_TRANSACTION,
                        transactionCount: transactionCount,
                        lastError: getStatus().lastError
                    }
                }
            },
            toInit(): Status<MetaStatuses, "init"> {
                return {
                    name: "init",
                    data: {
                        status: MetaStatus.INIT,
                        transactionCount: getStatus().transactionCount,
                        lastError: getStatus().lastError
                    }
                }
            },
            toRunning(): Status<MetaStatuses, "running"> {
                return {
                    name: "running",
                    data: {
                        status: MetaStatus.RUNNING,
                        transactionCount: getStatus().transactionCount,
                        lastError: getStatus().lastError
                    }
                }
            },
            toError(error: any): Status<MetaStatuses, "error"> {
                return {
                    name: "error",
                    data: {
                        status: MetaStatus.ERROR,
                        transactionCount: getStatus().transactionCount,
                        lastError: error
                    }
                }

            }
        };
    }

    static createSteps (getState: IProducer<MetaInfo>): MetaSteps {
        return ({
                $onTransaction(timing: FlowEventTiming): MetaInfo {
                    let metaInfo = getState ();
                    return {
                        status: metaInfo.status,
                        transactionCount: timing === FlowEventTiming.START ? ++ metaInfo.transactionCount: --metaInfo.transactionCount,
                        lastError: metaInfo.lastError
                    }
                },
            }
        )
    }
}
