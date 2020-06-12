import {StatusDef} from "../status/statusDef";
import {IProducer} from "../../..";
import {AsapLike} from "../../../conan-utils/asap";
import {StatusLike} from "../../domain/status";
import {Mutators, VoidMutators} from "../../domain/mutators";


export interface FlowDef<
    STATUSES,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
>{
    name: string,
    statusesByStatusName: {[STATUS in keyof STATUSES]: StatusDef <STATUSES, STATUS, MUTATORS>};
    starter?: IProducer<AsapLike<StatusLike<STATUSES>>>
}
