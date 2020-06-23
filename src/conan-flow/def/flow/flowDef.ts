import {StatusDef} from "../status/statusDef";
import {IFunction, IProducer} from "../../..";
import {AsapLike} from "../../../conan-utils/asap";
import {StatusLike} from "../../domain/status";
import {Mutators, VoidMutators} from "../../domain/mutators";
import {FlowEvent, FlowEventNature} from "../../domain/flowRuntimeEvents";


export interface FlowDef<
    STATUSES,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
>{
    name: string;
    statusesByStatusName: {[STATUS in keyof STATUSES]: StatusDef <STATUSES, STATUS, MUTATORS>};
    nature: FlowEventNature;
    starter?: IProducer<AsapLike<StatusLike<STATUSES>>>;
    logger?: IFunction<FlowEvent, boolean>;
}
