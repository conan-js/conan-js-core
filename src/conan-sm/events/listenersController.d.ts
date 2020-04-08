import { SmListener, SmListenerDefLike, SmListenerDefList } from "./stateMachineListeners";
import { TransactionTree } from "../../conan-tx/transactionTree";
import { IBiFunction, WithMetadataArray } from "../../conan-utils/typesHelper";
import { StateMachineLogger } from "../logging/stateMachineLogger";
import { StateMachineCoreRead } from "../core/stateMachineCoreReader";
import { ReactionMetadata, Reaction, ReactionType } from "../reactions/reactor";
export declare class ListenersController<ON_LISTENER extends SmListener, ACTIONS = any> {
    listeners: SmListenerDefList<ON_LISTENER>;
    readonly Logger$: IBiFunction<StateMachineCoreRead<any>, TransactionTree, StateMachineLogger>;
    private readonly smListenerDefLikeParser;
    constructor(listeners: SmListenerDefList<ON_LISTENER>, Logger$: IBiFunction<StateMachineCoreRead<any>, TransactionTree, StateMachineLogger>);
    addListener(stateMachineCore: StateMachineCoreRead<any>, listener: SmListenerDefLike<ON_LISTENER>, type?: ReactionType): this;
    createReactions(stateMachineCore: StateMachineCoreRead<any>, transactionTree: TransactionTree, eventName: string): WithMetadataArray<Reaction<ACTIONS>, ReactionMetadata>;
    deleteListeners(stateMachineCore: StateMachineCoreRead<any>, transactionTree: TransactionTree, listenerNames: string[]): void;
}
