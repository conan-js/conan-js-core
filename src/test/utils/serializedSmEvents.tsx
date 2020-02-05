import {Strings} from "../../lib/conan-utils/strings";
import {SerializedSmEvent, TriggerType} from "../../lib/conan-sm/domain";

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
                trigger: TriggerType.START,
                stageName: 'start'
            },
            ...(initialStage ? [SerializedSmEvents.explodeNameAndPayload (initialStage, TriggerType.START)] : []),
            ...toWrap,
            {
                eventName: 'onStop',
                trigger: TriggerType.STOP,
                stageName: 'stop'
            },
        ]
    }

    static stageAction (fromStage: string, actionName: string, payload: any, intoStage: string, requirements?: any): SerializedSmEvent[] {
        return [{
            eventName: Strings.camelCaseWithPrefix('on', actionName),
            ... (payload ? {payload: payload} : undefined),
            trigger: TriggerType.ACTION_FROM,
            stageName: fromStage
        }, {
            eventName: Strings.camelCaseWithPrefix('on', intoStage),
            ... (requirements ? {payload: requirements} : undefined),
            trigger: TriggerType.ACTION_INTO,
            stageName: intoStage
        }];
    }
    static fork (source: NameAndPayloadDefLike, causes: NameAndPayloadDefLike, childEvents: SerializedSmEvent[]): SerializedSmEvent[] {
        let forkStart: SerializedSmEvent = {
            ...SerializedSmEvents.explodeNameAndPayload(source, TriggerType.FORK_START),
            fork: SerializedSmEvents.events(childEvents, causes),
        };
        let lastEvent:SerializedSmEvent = childEvents[childEvents.length-1];
        let forkEnd: SerializedSmEvent = {
            ...lastEvent,
            trigger: TriggerType.FORK_JOIN,
            eventName: Strings.camelCaseWithPrefix('on', lastEvent.stageName)
        };
        return [
            forkStart,
            forkEnd
        ]
    }

    private static explodeNameAndPayload(toExplode: NameAndPayloadDefLike, trigger: TriggerType): SerializedSmEvent {
        if (typeof toExplode === 'string') {
            return {
                stageName: toExplode,
                trigger: trigger,
                eventName: Strings.camelCaseWithPrefix('on', toExplode)
            }
        }
        return {
            stageName: toExplode.stageName,
            ... (toExplode.payload ? {payload: toExplode.payload} : undefined),
            trigger: trigger,
            eventName: toExplode.eventName == null ? Strings.camelCaseWithPrefix('on', toExplode.stageName) : toExplode.eventName
        };
    }


}
