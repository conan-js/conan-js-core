import { IConsumer, IFunction, WithMetadataArray } from "../../conan-utils/typesHelper";
import { ForkService } from "../services/forkService";
import { StateMachineController } from "../stateMachineController";
import { State } from "../core/state";
import { SerializedSmEvent } from "../events/stateMachineEvents";
export declare enum ReactionType {
    ONCE = "ONCE",
    ALWAYS = "ALWAYS"
}
export interface ReactionMetadata {
    name: string;
    executionType: ReactionType;
}
export declare type NamedReactions<PATHS, DATA = any> = WithMetadataArray<Reaction<PATHS, DATA>, ReactionMetadata>;
export declare type Reaction<PATHS, DATA = any> = IConsumer<Reactor<PATHS, DATA>>;
export declare type PathRequester<PATHS> = IFunction<PATHS, State<any, any>>;
export declare type PathDeferrer<PATHS> = IConsumer<PATHS>;
export interface Reactor<PATHS = any, DATA = any> {
    stateName: string;
    stateData: DATA;
    paths: PATHS;
    events: SerializedSmEvent[];
    request(pathRequester: PathRequester<PATHS>): void;
    defer(pathRequester: PathDeferrer<PATHS>): void;
}
export declare class ReactorImpl<PATHS, DATA> implements Reactor<PATHS, DATA> {
    private readonly state;
    readonly paths: PATHS;
    readonly events: SerializedSmEvent[];
    private readonly forkService;
    private readonly stateMachineController;
    constructor(state: State<string, DATA>, paths: PATHS, events: SerializedSmEvent[], forkService: ForkService, stateMachineController: StateMachineController<any>);
    request(pathRequester: PathRequester<PATHS>): void;
    defer(pathRequester: PathDeferrer<PATHS>): void;
    get stateName(): string;
    get stateData(): DATA;
}
