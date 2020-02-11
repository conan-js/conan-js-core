import {WithMetadataArray} from "../conan-utils/typesHelper";
import {SmEvent, SmEventCallback, SmListener} from "./domain";

export class ReactionsFactory<ACTIONS> {
    create(event: SmEvent, actions: ACTIONS, smListeners: WithMetadataArray<SmListener, string>): WithMetadataArray<SmEventCallback<ACTIONS>, string> {

        if (smListeners == null || smListeners.length === 0) return [];

        let reactions: WithMetadataArray<SmEventCallback<ACTIONS>, string> = [];
        smListeners.forEach(smListener => {
            let actionListener: SmEventCallback<ACTIONS> = smListener.value[event.eventName];
            if (!actionListener) return undefined;

            reactions.push({
                value: actionListener,
                metadata: smListener.metadata
            });
        });

        return reactions;

    }
}
