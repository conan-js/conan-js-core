import {SmStartable, StateMachine, StateMachineType} from "./conan-sm/stateMachine";
import {SmListener, SmListenerDefLike} from "./conan-sm/events/stateMachineListeners";
import {StateMachineCoreReader} from "./conan-sm/core/stateMachineCoreReader";
import {EventType} from "./conan-sm/logging/stateMachineLogger";
import {State} from "./conan-sm/core/state";
import {SmTransition} from "./conan-sm/events/stateMachineEvents";
import {AsapLike} from "./conan-utils/asap";
import {IFunction} from "./conan-utils/typesHelper";


export class StateMachineFacade <
    SM_ON_LISTENER extends SmListener,
    STARTER = AsapLike<State<any>>
>
extends StateMachineCoreReader<SM_ON_LISTENER>
implements
    StateMachine<SM_ON_LISTENER>,
    SmStartable<STARTER>
{
    public readonly type: StateMachineType;
    constructor(
        private readonly sm: StateMachine<SM_ON_LISTENER> & SmStartable<AsapLike<State<any>>>,
        private readonly startMapper: IFunction<STARTER, AsapLike<State<any>>>
    ) {
        super(sm);
        this.type = this.sm.type;
    }


    log(eventType: EventType, details?: string, additionalLines?: [string, any][]): void {
        this.sm.log(eventType, details, additionalLines);
    }

    requestState<T = any>(state: State<any, T>): void {
        this.sm.requestState(state);
    }

    requestTransition(transition: SmTransition): this {
        this.sm.requestTransition(transition);
        return this;
    }

    runIf(toRun: SmListenerDefLike<SM_ON_LISTENER>): void {
        this.sm.runIf(toRun);
    }

    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void {
        this.sm.runNow(toRun);
    }

    stop(): void {
        this.sm.stop();
    }

    start(starter: STARTER): this{
        this.sm.start(this.startMapper(starter));
        return this;
    }
}
