import {ListenerType, SmListener, SmListenerDefLike} from "./core/stateMachineListeners";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {State, StateDef} from "./core/state";
import {WithMetadata} from "..";
import {TransactionTree} from "../conan-tx/transactionTree";
import {StateMachineCore, StateMachineCoreRead, StateMachineCoreWrite} from "./core/stateMachineCore";
import {RuntimeInformation, SmOrchestrator} from "./wiring/smOrchestrator";

export interface ListenerMetadata {
    name: string,
    executionType: ListenerType,
}

export enum ListenerDefType {
    LISTENER = 'LISTENER',
    INTERCEPTOR = 'INTERCEPTOR',
}


export interface StateMachine<SM_ON_LISTENER extends SmListener> extends StateMachineCoreRead<SM_ON_LISTENER>, StateMachineLogger {
    requestState(state: State): void;

    requestTransition(transition: SmTransition): this;

    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void;

    getStateName(): string;
}

export type StateMachineFacade<SM_ON_LISTENER extends SmListener> = StateMachine<SM_ON_LISTENER> & StateMachineCoreWrite;

export class StateMachineImpl<
    SM_ON_LISTENER extends SmListener,
> implements StateMachine<SM_ON_LISTENER> {
    private readonly facade: StateMachineFacade<SM_ON_LISTENER>;

    constructor(
        private readonly stateMachineCore: StateMachineCore<SM_ON_LISTENER>,
        private readonly runtimeInfo: RuntimeInformation,
        private readonly orchestrator: SmOrchestrator,
        private readonly logger: StateMachineLogger
    ) {
        this.facade = {
            ...this,
            moveToState:(state: State): void =>{
                this.stateMachineCore.moveToState(state);
            },
            moveToTransition: (transition: SmTransition): void => {
                this.stateMachineCore.moveToTransition(transition);
            }
        }
    }

    requestState(state: State): void {
        this.orchestrator.requestState (this.facade, state, this.runtimeInfo);
    }

    requestTransition(transition: SmTransition): this {
        this.orchestrator.requestTransition (this.facade, transition, this.runtimeInfo);
        return this;
    }


    runNow(toRun: SmListenerDefLike<SM_ON_LISTENER>): void {
        this.orchestrator.runNow (this.facade, toRun, this.runtimeInfo);
    }

    addListener(listener: [string, SM_ON_LISTENER] | SM_ON_LISTENER, txTree: TransactionTree, type: ListenerType): this {
        this.stateMachineCore.addListener(listener, txTree, type);
        return this;
    }

    createReactions(eventName: string, type: ListenerDefType): WithMetadata<(toConsume: any) => void, ListenerMetadata>[] {
        return this.stateMachineCore.createReactions(eventName, type, this.runtimeInfo.txTree);
    }

    deleteListeners(listenerNames: string[], type: ListenerDefType): void {
        this.stateMachineCore.deleteListeners(listenerNames, type, this.runtimeInfo.txTree);
    }

    getCurrentStageName(): string {
        return this.stateMachineCore.getCurrentStageName();
    }

    getCurrentTransitionName(): string {
        return this.stateMachineCore.getCurrentTransitionName();
    }

    getEvents(): SerializedSmEvent[] {
        return this.stateMachineCore.getEvents();
    }

    getStateName(): any {
        return this.stateMachineCore.getStateName();
    }

    getStateData(): any {
        return this.stateMachineCore.getStateData();
    }

    getStateDef(name: string): StateDef<any, any, any> {
        return this.stateMachineCore.getStateDef(name);
    }

    log(eventType: EventType, details?: string, additionalLines?: [string, string][]): void {
        this.logger.log(eventType, details, additionalLines);
    }
}
