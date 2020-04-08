import { ListenerDefType, SmListener, SmListenerDefLike } from "../events/stateMachineListeners";
import { State } from "./state";
import { SerializedSmEvent } from "../events/stateMachineEvents";
import { TransactionTree } from "../../conan-tx/transactionTree";
import { WithMetadataArray } from "../../conan-utils/typesHelper";
import { ReactionMetadata, Reaction, ReactionType } from "../reactions/reactor";
import { StateDef } from "./stateDef";
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
export declare class StateMachineCoreReader<SM_ON_LISTENER extends SmListener> implements StateMachineCoreRead<SM_ON_LISTENER> {
    protected readonly core_: StateMachineCoreRead<SM_ON_LISTENER>;
    constructor(core_: StateMachineCoreRead<SM_ON_LISTENER>);
    addListener(listener: [string, SM_ON_LISTENER] | SM_ON_LISTENER, type: ReactionType): this;
    createReactions(eventName: string, type: ListenerDefType, txTree: TransactionTree): WithMetadataArray<Reaction<any>, ReactionMetadata>;
    deleteListeners(listenerNames: string[], type: ListenerDefType, txTree: TransactionTree): void;
    getCurrentStateName(): string;
    getCurrentTransitionName(): string;
    getEvents(): SerializedSmEvent[];
    getStateData(): any;
    getStateDef(name: string): StateDef<any>;
    getStateName(): string;
    getName(): string;
    getState(): any;
}
