import {
    ListenerDefType,
    SmListener,
    SmListenerDefLike
} from "../events/stateMachineListeners";
import {State} from "./state";
import {SerializedSmEvent} from "../events/stateMachineEvents";
import {TransactionTree} from "../../conan-tx/transactionTree";
import {WithMetadataArray} from "../../conan-utils/typesHelper";
import {ReactionMetadata, Reaction, ReactionType} from "../reactions/reactor";
import {StateDef} from "./stateDef";

export interface StateMachineCoreRead<SM_ON_LISTENER extends SmListener> {
    getStateDef(name: string): StateDef<any>;

    addListener(listener: SmListenerDefLike<SM_ON_LISTENER>, type: ReactionType): this;

    getEvents(): SerializedSmEvent[];

    getStateData(): any;

    getStateName(): string;

    createReactions(eventName: string, type: ListenerDefType, txTree: TransactionTree): WithMetadataArray<Reaction<any>, ReactionMetadata>;

    deleteListeners(listenerNames: string[], type: ListenerDefType, txTree: TransactionTree): void;

    getCurrentStateName(): string;

    getCurrentTransitionName(): string;

    getName(): string;

    getState(): State;
}

export class StateMachineCoreReader<SM_ON_LISTENER extends SmListener,
    > implements StateMachineCoreRead<SM_ON_LISTENER> {
    constructor(
        protected readonly core_: StateMachineCoreRead<SM_ON_LISTENER>
    ) {
    }

    addListener(listener: [string, SM_ON_LISTENER] | SM_ON_LISTENER, type: ReactionType): this {
        this.core_.addListener(listener, type);
        return this;
    }

    createReactions(eventName: string, type: ListenerDefType, txTree: TransactionTree): WithMetadataArray<Reaction<any>, ReactionMetadata> {
        return this.core_.createReactions(eventName, type, txTree);
    }

    deleteListeners(listenerNames: string[], type: ListenerDefType, txTree: TransactionTree): void {
        this.core_.deleteListeners(listenerNames, type, txTree);
    }

    getCurrentStateName(): string {
        return this.core_.getCurrentStateName();
    }

    getCurrentTransitionName(): string {
        return this.core_.getCurrentTransitionName();
    }

    getEvents(): SerializedSmEvent[] {
        return this.core_.getEvents();
    }

    getStateData(): any {
        return this.core_.getStateData();
    }

    getStateDef(name: string): StateDef<any> {
        return this.core_.getStateDef(name);
    }

    getStateName(): string {
        return this.core_.getStateName();
    }

    getName(): string {
        return this.core_.getName();
    }

    getState(): any {
        return this.core_.getState();
    }
}
