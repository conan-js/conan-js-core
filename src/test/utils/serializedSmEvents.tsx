import {Strings} from "../../lib/conan-utils/strings";
import {SerializedSmEvent} from "../../lib/conan-sm/stateMachineEvents";

export interface NameAndPayloadDef {
    stageName: string;
    eventName?: string;
    payload?: any;
}

export type NameAndPayloadDefLike = NameAndPayloadDef | string;

export class SerializedSmEvents {
    static events(toWrap?: SerializedSmEvent[], initialStage?: NameAndPayloadDefLike): SerializedSmEvent[] {
        return [
            {
                eventName: 'onStart',
                stageName: 'start'
            },
            ...(initialStage ? [SerializedSmEvents.explodeNameAndPayload (initialStage)] : []),
            ...toWrap,
            {
                eventName: 'onStop',
                stageName: 'stop'
            },
        ]
    }

    static stageAction (fromStage: string, actionName: string, payload: any, intoStage: string, requirements?: any): SerializedSmEvent[] {
        return [{
            eventName: Strings.camelCaseWithPrefix('on', actionName),
            ... (payload ? {payload: payload} : undefined),
            stageName: fromStage
        }, {
            eventName: Strings.camelCaseWithPrefix('on', intoStage),
            ... (requirements ? {payload: requirements} : undefined),
            stageName: intoStage
        }];
    }
    static fork (source: NameAndPayloadDefLike, causes: NameAndPayloadDefLike, childEvents: SerializedSmEvent[]): SerializedSmEvent[] {
        let forkStart: SerializedSmEvent = {
            ...SerializedSmEvents.explodeNameAndPayload(source),
            fork: SerializedSmEvents.events(childEvents.slice(0, childEvents.length - 1), causes),
        };
        let lastEvent:SerializedSmEvent = childEvents[childEvents.length-1];
        let forkEnd: SerializedSmEvent = {
            ...lastEvent,
            eventName: Strings.camelCaseWithPrefix('on', lastEvent.stageName)
        };
        return [
            forkStart,
            forkEnd
        ]
    }

    private static explodeNameAndPayload(toExplode: NameAndPayloadDefLike): SerializedSmEvent {
        if (typeof toExplode === 'string') {
            return {
                stageName: toExplode,
                eventName: Strings.camelCaseWithPrefix('on', toExplode)
            }
        }
        return {
            stageName: toExplode.stageName,
            ... (toExplode.payload ? {payload: toExplode.payload} : undefined),
            eventName: toExplode.eventName == null ? Strings.camelCaseWithPrefix('on', toExplode.stageName) : toExplode.eventName
        };
    }


}
