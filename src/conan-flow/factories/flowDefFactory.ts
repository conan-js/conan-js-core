import {FlowDef} from "../def/flow/flowDef";
import {UserFlowDef} from "../def/flow/userFlowDef";
import {StatusDef, StatusesDef} from "../def/status/statusDef";
import {Objects} from "../../conan-utils/objects";
import {MutatorsFactory} from "./mutatorsFactory";
import {FlowAnchor} from "../logic/flowAnchor";
import {UserFlowStatusesDef, UserStatusDef} from "../def/status/userStatusDef";
import {$INIT, $STOP} from "../domain/flow";
import {ReactionType} from "../domain/reactions";
import {ReactionDefLikeParser} from "../def/reactionDef";
import {Mutators, VoidMutators} from "../domain/mutators";

export class FlowDefFactory {
    static create<
        STATUSES,
        MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
        ACTIONS = void
    > (
        userFlowDef: UserFlowDef<STATUSES, MUTATORS, ACTIONS>,
        flowAnchor: FlowAnchor<STATUSES, MUTATORS>
    ): FlowDef<STATUSES, MUTATORS>{
        let statusesByStatusName = FlowDefFactory.statusesByName<STATUSES, MUTATORS> (
            userFlowDef.statuses,
            flowAnchor
        );


        statusesByStatusName [$INIT] = {
            name: $INIT,
            steps: MutatorsFactory.createDefaultSteps <any, '$init'> ($INIT, flowAnchor as any),
            transitions: MutatorsFactory.createTransitions<any, '$init'>($INIT, flowAnchor as any),
            reactions: userFlowDef.$onInit ?
                userFlowDef.$onInit.map(it=>(
                    ReactionDefLikeParser.parse(it, ReactionType.ALWAYS, `on init`)
                ) as  any) : [],
        }

        statusesByStatusName [$STOP] = {
            name: $STOP,
            steps: MutatorsFactory.createDefaultSteps <any, '$stop'> ($STOP, flowAnchor as any),
            transitions: MutatorsFactory.createTransitions<any, '$stop'>($STOP, flowAnchor as any),
            reactions: userFlowDef.$onStop ?
                userFlowDef.$onStop.map(it=>(
                    ReactionDefLikeParser.parse(it, ReactionType.ALWAYS, `on stop`)
                ) as  any) : [],
        }

        return {
            statusesByStatusName: statusesByStatusName,
            name: userFlowDef.name,
            ... userFlowDef.hasOwnProperty('initialStatus') ? {starter: ()=>userFlowDef.initialStatus}: undefined
        } as any
    }




    static statusesByName<
        STATUSES,
        MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
    > (
        userStatusesDefLike: UserFlowStatusesDef<STATUSES, MUTATORS>,
        flowAnchor: FlowAnchor<STATUSES, MUTATORS>
    ): StatusesDef<STATUSES> {

        let statusesByName: StatusesDef<STATUSES> = {} as any;
        if (Array.isArray(userStatusesDefLike)) {
            userStatusesDefLike.forEach(it=>{
                statusesByName [it] = {
                    name: it,
                    steps: [],
                    reactions: [],
                };
            })
        }else {
            Objects.foreachEntry<UserStatusDef<STATUSES>>(userStatusesDefLike as any, (value, key)=>{
                statusesByName [key] = {
                    name: key,
                    steps: MutatorsFactory.createSteps(key as any, flowAnchor as any, value.steps as any) as any,
                    transitions: MutatorsFactory.createTransitions(key as any, flowAnchor as any, value.transitions as any) as any,
                    reactions: value.reactions ?
                                value.reactions.map(it=>ReactionDefLikeParser.parse(
                                    it,
                                    ReactionType.ALWAYS,
                                    `on[${key}]`
                                )) :
                                [],
                    getLastData: flowAnchor.getDataFn(key as any)
                } as StatusDef <STATUSES, any, MUTATORS>;
            })
        }

        return statusesByName;
    }
}
