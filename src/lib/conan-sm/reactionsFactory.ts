import {ICallback} from "../conan-utils/typesHelper";
import {ActionListener, SmEvent, SmListener} from "./domain";

export class ReactionsFactory<ACTIONS> {
    create(event: SmEvent, actions: ACTIONS, smListeners: SmListener[]): ICallback[] {

        if (smListeners == null || smListeners.length === 0) return [];

        let reactions: ICallback [] = [];
        smListeners.forEach(smListener => {
            let actionListener: ActionListener<ACTIONS, any> = smListener[event.eventName];
            if (!actionListener) return undefined;

            let reaction = this.adaptListenerAsReaction(actions, event, actionListener);
            reactions.push(reaction);
        });

        return reactions;

    }

    private adaptListenerAsReaction(actions: ACTIONS, event: SmEvent, actionsListener: ActionListener<ACTIONS, any, any>): ICallback {
        return () => {
            if (actionsListener.thenRequest) {
                actionsListener.thenRequest(actions, event);
            }

            if (actionsListener.then) {
                actionsListener.then(undefined, event);
            }

            if (actionsListener.withPayload) {
                actionsListener.withPayload(event.payload, event);
            }

        }
    }
}
