import { SmListener, SmListenerDefLike } from "./events/stateMachineListeners";
import { State } from "./core/state";
import { StateMachineCore } from "./core/stateMachineCore";
import { SmOrchestrator } from "./wiring/smOrchestrator";
import { EventType, StateMachineLogger } from "./logging/stateMachineLogger";
import { SerializedSmEvent, SmTransition } from "./events/stateMachineEvents";
import { SmEventsSerializer } from "./events/smEventsSerializer";
import { StateMachineCoreRead, StateMachineCoreReader } from "./core/stateMachineCoreReader";
import { ForkStateMachineListener } from "./prototypes/forkStateMachine";
import { TransactionTree } from "../conan-tx/transactionTree";
import { FlowStateMachineListener } from "./prototypes/flowStateMachine";
import { AsapLike } from "../conan-utils/asap";
export declare enum StateMachineType {
    USER = "USER",
    FLOW = "FLOW",
    USER_FORK = "USER_FORK",
    FLOW_FORK = "FLOW_FORK"
}
export interface SmStartable<T> {
    start(starter: T): this;
}
export interface StateMachine<SM_ON_LISTENER extends SmListener> extends StateMachineCoreRead<SM_ON_LISTENER>, StateMachineLogger {
    requestState<T = any>(state: State<any, T>): void;
    requestTransition(transition: SmTransition): this;
    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void;
    runIf(toRun: SmListenerDefLike<SM_ON_LISTENER>): void;
    stop(): void;
    type: StateMachineType;
}
export declare class StateMachineImpl<SM_ON_LISTENER extends SmListener> extends StateMachineCoreReader<SM_ON_LISTENER> implements StateMachine<SM_ON_LISTENER>, SmStartable<AsapLike<State<any>>> {
    private readonly stateMachineCore;
    private readonly txTree;
    private readonly orchestrator;
    private readonly logger;
    private readonly smEventsSerializer;
    readonly type: StateMachineType;
    readonly forkSm?: StateMachine<ForkStateMachineListener>;
    private readonly controller;
    flowSm?: StateMachine<FlowStateMachineListener>;
    constructor(stateMachineCore: StateMachineCore<SM_ON_LISTENER>, txTree: TransactionTree, orchestrator: SmOrchestrator, logger: StateMachineLogger, smEventsSerializer: SmEventsSerializer, type: StateMachineType, forkSm?: StateMachine<ForkStateMachineListener>);
    requestState<T = any>(state: State<any, T>): void;
    requestTransition(transition: SmTransition): this;
    runIf(toRun: SmListenerDefLike<SM_ON_LISTENER>): void;
    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void;
    log(eventType: EventType, details?: string, additionalLines?: [string, string][]): void;
    stop(): void;
    start<STATE extends State<any> = any>(starter: AsapLike<STATE>): this;
    getEvents(): SerializedSmEvent[];
}
