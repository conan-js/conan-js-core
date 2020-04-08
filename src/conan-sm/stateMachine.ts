import {SmListener, SmListenerDefLike} from "./events/stateMachineListeners";
import {State} from "./core/state";
import {StateMachineCore} from "./core/stateMachineCore";
import {SmOrchestrator} from "./wiring/smOrchestrator";
import {StateMachineController} from "./stateMachineController";
import {EventType, StateMachineLogger} from "./logging/stateMachineLogger";
import {SerializedSmEvent, SmTransition} from "./events/stateMachineEvents";
import {SmEventsSerializer} from "./events/smEventsSerializer";
import {StateMachineCoreRead, StateMachineCoreReader} from "./core/stateMachineCoreReader";
import {ForkStateMachineListener} from "./prototypes/forkStateMachine";
import {TransactionTree} from "../conan-tx/transactionTree";
import {FlowStateMachineListener} from "./prototypes/flowStateMachine";
import {AsapLike, AsapParser} from "../conan-utils/asap";

export enum StateMachineType {
    USER='USER',
    FLOW='FLOW',
    USER_FORK='USER_FORK',
    FLOW_FORK='FLOW_FORK',
}

export interface SmStartable <T> {
    start(starter: T): this;
}

export interface StateMachine<
    SM_ON_LISTENER extends SmListener
> extends StateMachineCoreRead<SM_ON_LISTENER>, StateMachineLogger {
    requestState<T = any>(state: State<any, T>): void;

    requestTransition(transition: SmTransition): this;

    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void;

    runIf(toRun: SmListenerDefLike<SM_ON_LISTENER>): void;

    stop(): void;

    type: StateMachineType;
}

export class StateMachineImpl<
    SM_ON_LISTENER extends SmListener,
>
extends StateMachineCoreReader<SM_ON_LISTENER>
implements
    StateMachine<SM_ON_LISTENER>,
    SmStartable <AsapLike<State<any>>>
{
    private readonly controller: StateMachineController<SM_ON_LISTENER>;
    public flowSm?: StateMachine<FlowStateMachineListener>;

    constructor(
        private readonly stateMachineCore: StateMachineCore<SM_ON_LISTENER>,
        private readonly txTree: TransactionTree,
        private readonly orchestrator: SmOrchestrator,
        private readonly logger: StateMachineLogger,
        private readonly smEventsSerializer: SmEventsSerializer,
        public readonly type: StateMachineType,
        public readonly forkSm?: StateMachine<ForkStateMachineListener>,
    ) {
        super(stateMachineCore);
        this.controller = new StateMachineController<SM_ON_LISTENER>(this.stateMachineCore, this, forkSm);
    }

    requestState<T = any>(state: State<any, T>): void {
        this.orchestrator.requestState (this.controller, state, this.txTree);
    }

    requestTransition(transition: SmTransition): this {
        this.orchestrator.requestTransition (this.controller, transition, this.txTree);
        return this;
    }

    runIf(toRun: SmListenerDefLike<SM_ON_LISTENER>): void {
        this.orchestrator.runIf (this.controller, toRun, this.txTree);
    }

    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void {
        this.orchestrator.runNow (this.controller, toRun, this.txTree);
    }

    log(eventType: EventType, details?: string, additionalLines?: [string, string][]): void {
        this.logger.log(eventType, details, additionalLines);
    }

    stop (): void {
        throw new Error(`TBI`);
    }

    start<STATE extends State<any> = any>(starter: AsapLike<STATE>): this {
        if (this.flowSm == null) {
            throw new Error(`unexpected error: can't start a state machine that does not have a flow SM: did you build this SM through the factory?`);
        }

        this.flowSm.runNow([`::init=>doStart`, {
            onInit: (next)=>next.paths.doStart(AsapParser.from(starter))
        }]);
        return this;
    }

    getEvents(): SerializedSmEvent[] {
        return this.smEventsSerializer.serialize(this.controller.getEventThread());
    }
}
