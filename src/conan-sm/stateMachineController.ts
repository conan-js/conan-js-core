import {SmListener} from "./events/stateMachineListeners";
import {StateMachineCore} from "./core/stateMachineCore";
import {State} from "./core/state";
import {StateMachine, StateMachineType} from "./stateMachine";
import {EventType} from "./logging/stateMachineLogger";
import {SmTransition} from "./events/stateMachineEvents";
import {SmEventThread} from "./events/smEventThread";
import {StateMachineCoreReader} from "./core/stateMachineCoreReader";
import {StateMachineCoreWrite} from "./core/stateMachineCoreWriter";
import {IConsumer} from "../conan-utils/typesHelper";
import {ForkStateMachineListener} from "./prototypes/forkStateMachine";

export class StateMachineController<SM_ON_LISTENER extends SmListener>
    extends StateMachineCoreReader<SM_ON_LISTENER>
    implements StateMachine<SM_ON_LISTENER>, StateMachineCoreWrite {
    constructor(
        private readonly core: StateMachineCore<SM_ON_LISTENER>,
        private readonly stateMachine: StateMachine<SM_ON_LISTENER>,
        private readonly forkSm?: StateMachine<ForkStateMachineListener>,
    ) {
        super(core);
    }

    log(eventType: EventType, details?: string, additionalLines?: [string, any][]): void {
        this.stateMachine.log(eventType, details, additionalLines);
    }

    moveToState(state: State<any, any>): void {
        this.core.moveToState(state);
    }

    moveToTransition(transition: SmTransition): void {
        this.core.moveToTransition(transition);
    }

    requestState<T = any>(state: State<any, T>): void {
        this.stateMachine.requestState(state);
    }

    requestTransition(transition: SmTransition): this {
        this.stateMachine.requestTransition(transition);
        return this;
    }

    runNow(toRun: [string, SM_ON_LISTENER] | SM_ON_LISTENER): void {
        this.stateMachine.runNow(toRun);
    }

    stop(): void {
        this.stateMachine.stop();
    }

    getEventThread(): SmEventThread {
        return this.core.getEventThread();
    }

    get type (): StateMachineType {
        return this.stateMachine.type;
    }

    assertForkable(ifForkable: IConsumer<StateMachine<ForkStateMachineListener>>) {
        if (!this.forkSm) {
            throw new Error(`assuming that the state machine: ${this.getName()} is forkable, but is not`);
        }

        ifForkable(this.forkSm);
    }

    ifForkable(ifForkable: IConsumer<StateMachine<ForkStateMachineListener>>) {
        if (this.forkSm) {
            ifForkable(this.forkSm);
        }
    }

    runIf(toRun: [string, SM_ON_LISTENER] | SM_ON_LISTENER): void {
        this.stateMachine.runIf(toRun);
    }
}
