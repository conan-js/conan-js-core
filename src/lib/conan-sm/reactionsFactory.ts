import {ICallback, WithMetadata, WithMetadataArray} from "../conan-utils/typesHelper";
import {ActionListener, SmEvent, SmListener} from "./domain";

export class ReactionsFactory<ACTIONS> {
    create(event: SmEvent, actions: ACTIONS, smListeners: WithMetadataArray<SmListener, string>): WithMetadataArray<ICallback, string> {

        if (smListeners == null || smListeners.length === 0) return [];

        let reactions: WithMetadataArray<ICallback, string> = [];
        smListeners.forEach(smListener => {
            let actionListener: ActionListener<ACTIONS, any> = smListener.value[event.eventName];
            if (!actionListener) return undefined;

            let reaction = this.adaptListenerAsReaction(actions, event, actionListener, smListener.metadata);
            reactions.push(reaction);
        });

        return reactions;

    }

    private adaptListenerAsReaction(actions: ACTIONS, event: SmEvent, actionsListener: ActionListener<ACTIONS, any, any>, description: string): WithMetadata<ICallback, string> {
        return {
            value: () => {
                if (actionsListener.thenRequest) {
                    actionsListener.thenRequest(actions, event);
                }

                if (actionsListener.then) {
                    actionsListener.then(undefined, event);
                }

                if (actionsListener.withPayload) {
                    actionsListener.withPayload(event.payload, event);
                }

            },
            metadata: description
        };
    }
}
