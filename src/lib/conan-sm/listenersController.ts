import {
    ListenerType,
    OnEventCallback,
    SmListener,
    SmListenerDefLike,
    SmListenerDefLikeParser,
    SmListenerDefList
} from "./stateMachineListeners";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {IBiFunction, WithMetadataArray} from "../conan-utils/typesHelper";
import {ListenerMetadata, StateMachineCore} from "./stateMachine";
import {TransactionTree} from "../conan-tx/transactionTree";

export class ListenersController<
    ON_LISTENER extends SmListener,
    ACTIONS
> {
    private readonly smListenerDefLikeParser: SmListenerDefLikeParser = new SmListenerDefLikeParser();

    constructor(
        private listeners: SmListenerDefList<ON_LISTENER>,
        readonly Logger$: IBiFunction<StateMachineCore<any>, TransactionTree, StateMachineLogger>
    ) {}

    addListener(listener: SmListenerDefLike<ON_LISTENER>, type: ListenerType = ListenerType.ALWAYS): this {
        this.listeners.push(
            this.smListenerDefLikeParser.parse(listener, type)
        );
        return this;
    }

    createReactions(stateMachineCore: StateMachineCore<any>, transactionTree: TransactionTree, eventName: string): WithMetadataArray<OnEventCallback<ACTIONS>, ListenerMetadata> {
        let reactions: WithMetadataArray<OnEventCallback<ACTIONS>, ListenerMetadata> = [];
        this.listeners.forEach(listener => {
            let actionListener: OnEventCallback<ACTIONS> = listener.value[eventName];
            if (!actionListener) return undefined;

            reactions.push({
                value: (actions) => {
                    this.Logger$(stateMachineCore, transactionTree).log(EventType.REACTION,  `(${listener.metadata.name})`);
                    actionListener(actions)
                },
                metadata: listener.metadata
            });
        });

        return reactions;
    }

    deleteListeners(stateMachineCore: StateMachineCore<any>, transactionTree: TransactionTree, listenerNames: string[]) {
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
