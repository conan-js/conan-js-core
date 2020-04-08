import { SmListener } from "./events/stateMachineListeners";
import { StateMachineCore } from "./core/stateMachineCore";
import { State } from "./core/state";
import { StateMachine, StateMachineType } from "./stateMachine";
import { EventType } from "./logging/stateMachineLogger";
import { SmTransition } from "./events/stateMachineEvents";
import { SmEventThread } from "./events/smEventThread";
import { StateMachineCoreReader } from "./core/stateMachineCoreReader";
import { StateMachineCoreWrite } from "./core/stateMachineCoreWriter";
import { IConsumer } from "../conan-utils/typesHelper";
import { ForkStateMachineListener } from "./prototypes/forkStateMachine";
export declare class StateMachineController<SM_ON_LISTENER extends SmListener> extends StateMachineCoreReader<SM_ON_LISTENER> implements StateMachine<SM_ON_LISTENER>, StateMachineCoreWrite {
    private readonly core;
    private readonly stateMachine;
    private readonly forkSm?;
    constructor(core: StateMachineCore<SM_ON_LISTENER>, stateMachine: StateMachine<SM_ON_LISTENER>, forkSm?: StateMachine<ForkStateMachineListener>);
    log(eventType: EventType, details?: string, additionalLines?: [string, any][]): void;
    moveToState(state: State<any, any>): void;
    moveToTransition(transition: SmTransition): void;
    requestState<T = any>(state: State<any, T>): void;
    requestTransition(transition: SmTransition): this;
    runNow(toRun: [string, SM_ON_LISTENER] | SM_ON_LISTENER): void;
    stop(): void;
    getEventThread(): SmEventThread;
    get type(): StateMachineType;
    assertForkable(ifForkable: IConsumer<StateMachine<ForkStateMachineListener>>): void;
    ifForkable(ifForkable: IConsumer<StateMachine<ForkStateMachineListener>>): void;
    runIf(toRun: [string, SM_ON_LISTENER] | SM_ON_LISTENER): void;
}
