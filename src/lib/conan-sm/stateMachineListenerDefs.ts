import {SmListener} from "./domain";
import {
    DynamicOrStatics,
    OneOrMany,
    OneOrManyOf,
    ProvidedOrStaticOf,
    WithMetadata,
    WithMetadataArray,
    WithMetadataKeyValuePairs
} from "../conan-utils/typesHelper";
import {Objects} from "../conan-utils/objects";
import {StateMachine} from "./stateMachine";
import {Queue} from "./queue";

export type SMListenerDef <
    EVENT_LISTENERS extends SmListener,
    BASE_SM extends StateMachine<EVENT_LISTENERS, any>,
>= OneOrManyOf<ProvidedOrStaticOf<BASE_SM, EVENT_LISTENERS>>;

export type SMJoinerDef <
    SM_JOINER extends SmListener,
    BASE_SM extends StateMachine<any, SM_JOINER>,
    >= OneOrManyOf<ProvidedOrStaticOf<BASE_SM, SM_JOINER>>;


export interface SmListeningTypes <LISTENER_TYPE, JOINER_TYPE, KEY_LISTENER_TYPE = LISTENER_TYPE>
{
    whileRunning: WithMetadataArray<LISTENER_TYPE, string>;
}

export interface SmListenerDefsByType
<
    SM_LISTENER extends SmListener,
    SM_JOINER extends SmListener,
    BASE_SM extends StateMachine<SM_LISTENER, SM_JOINER>,
>
extends SmListeningTypes<SMListenerDef<SM_LISTENER, BASE_SM>, SMJoinerDef<SM_JOINER, BASE_SM>> {}

export interface SmListenersByType
<
    SM_LISTENER extends SmListener,
    SM_JOINER extends SmListener
>
extends SmListeningTypes<SM_LISTENER, SM_JOINER, SM_LISTENER[]> {}



export class StateMachineListenerDefs<
    SM_LISTENER extends SmListener,
    SM_JOINER extends SmListener,
    BASE_SM extends StateMachine<SM_LISTENER, SM_JOINER>,
> {
    static init <
        SM_LISTENER extends SmListener,
        SM_JOINER extends SmListener,
        BASE_SM extends StateMachine<SM_LISTENER, SM_JOINER>,
    >(): StateMachineListenerDefs <SM_LISTENER, SM_JOINER, BASE_SM> {
        return new StateMachineListenerDefs({
            whileRunning: [],
        });
    }

    constructor(
        public readonly listeners: SmListenerDefsByType<SM_LISTENER, SM_JOINER, BASE_SM>
    ) {}


    public asListenersByType (stateMachine: BASE_SM): SmListenersByType<SM_LISTENER, SM_JOINER> {
        return {
            whileRunning: StateMachineListenerDefs.transformListeners <SM_LISTENER, SM_JOINER, SM_LISTENER> (this.listeners.whileRunning, stateMachine),
        };
    }

    addWhileRunning(name:string, listener: SMListenerDef<SM_LISTENER, BASE_SM>) {
        this.listeners.whileRunning.push({
            value: listener,
            metadata: name
        });
    }

    static transformListener <SM_LISTENER extends SmListener, SM_JOINER extends SmListener, LISTENER_OR_JOINER extends SM_LISTENER | SM_JOINER>(toTransform: WithMetadata<SMListenerDef<LISTENER_OR_JOINER, any>, string>, stateMachine: StateMachine<SM_LISTENER, SM_JOINER>): WithMetadata<LISTENER_OR_JOINER, string> []{
        let result: WithMetadata<LISTENER_OR_JOINER, string> [] = [];
        OneOrMany.asArray(toTransform.value).forEach((it)=>{
            result.push({
                value: DynamicOrStatics.result(it, stateMachine),
                metadata: toTransform.metadata
            })
        });
        return result
    }

    static transformListeners <SM_LISTENER extends SmListener, SM_JOINER extends SmListener, LISTENER_OR_JOINER extends SM_LISTENER | SM_JOINER> (toTransform: WithMetadataArray<SMListenerDef<LISTENER_OR_JOINER, any>, any>, stateMachine: StateMachine<SM_LISTENER, SM_JOINER>): WithMetadataArray<LISTENER_OR_JOINER, string>{
        let result: WithMetadataArray<LISTENER_OR_JOINER, string> = [];
        toTransform.forEach(stateMachineListener => {
            result= [
                ...result,
                ...StateMachineListenerDefs.transformListener(stateMachineListener, stateMachine)
            ]
        });
        return result;
    }
}
