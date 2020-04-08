import {
    SmListener,
    SmListenerDefLike,
    SmListenerDefLikeParser,
    SmListenerDefList
} from "./stateMachineListeners";
import {TransactionTree} from "../../conan-tx/transactionTree";
import {IBiFunction, WithMetadataArray} from "../../conan-utils/typesHelper";
import {EventType, StateMachineLogger} from "../logging/stateMachineLogger";
import {StateMachineCoreRead} from "../core/stateMachineCoreReader";
import {ReactionMetadata, Reaction, ReactionType} from "../reactions/reactor";

export class ListenersController<
    ON_LISTENER extends SmListener,
    ACTIONS = any
> {
    private readonly smListenerDefLikeParser: SmListenerDefLikeParser = new SmListenerDefLikeParser();

    constructor(
        public listeners: SmListenerDefList<ON_LISTENER>,
        readonly Logger$: IBiFunction<StateMachineCoreRead<any>, TransactionTree, StateMachineLogger>
    ) {}

    addListener(stateMachineCore: StateMachineCoreRead<any>, listener: SmListenerDefLike<ON_LISTENER>, type: ReactionType = ReactionType.ALWAYS): this {
        let parsedListener = this.smListenerDefLikeParser.parse(listener, type);
        this.Logger$(stateMachineCore, undefined).log(EventType.ADD_LISTENER,  `+(${parsedListener.metadata.name})[${parsedListener.metadata.executionType}]`);
        this.listeners.push(
            parsedListener
        );
        return this;
    }

    createReactions(stateMachineCore: StateMachineCoreRead<any>, transactionTree: TransactionTree, eventName: string): WithMetadataArray<Reaction<ACTIONS>, ReactionMetadata> {
        let reactions: WithMetadataArray<Reaction<ACTIONS>, ReactionMetadata> = [];
        this.listeners.forEach(listener => {
            let reaction: Reaction<ACTIONS> = listener.value[eventName];
            if (!reaction) return undefined;

            reactions.push({
                value: (actions) => {
                    this.Logger$(stateMachineCore, transactionTree).log(EventType.REACTION,  `(${listener.metadata.name})`);
                    reaction(actions)
                },
                metadata: listener.metadata
            });
        });

        return reactions;
    }

    deleteListeners(stateMachineCore: StateMachineCoreRead<any>, transactionTree: TransactionTree, listenerNames: string[]) {
        if (listenerNames.length === 0) return;

        let newListeners: SmListenerDefList<ON_LISTENER> = [];
        this.listeners.forEach(currentListener=>{
            if (listenerNames.indexOf(currentListener.metadata.name) > -1) {
                this.Logger$(stateMachineCore, transactionTree).log(EventType.DELETE_LISTENER,  `-(${currentListener.metadata.name})[${currentListener.metadata.executionType}]`);
            } else {
                newListeners.push(currentListener)
            }
        });
        this.listeners = newListeners;
    }

}
