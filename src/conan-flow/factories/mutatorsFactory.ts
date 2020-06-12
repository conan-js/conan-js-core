import {Steps, StepsDef} from "../def/stepsDef";
import {IFunction, IReducer} from "../../index";
import {DefaultTransitionDefFnPayload, DefaultTransitionFn, Transitions, TransitionsDef} from "../domain/transitions";
import {Status, StatusLike, StatusLikeParser} from "../domain/status";
import {BindBackType, FlowAnchor} from "../logic/flowAnchor";
import {Proxyfier} from "../../conan-utils/proxyfier";
import {BaseStates} from "../domain/flow";
import {StatusDataProducer} from "../domain/flowEvents";
import {DefaultStepFn} from "../domain/steps";

export class MutatorsFactory {
    static createDefaultStepsDef<
        STATUSES extends BaseStates,
        STATUS extends keyof STATUSES
    > ():StepsDef<STATUSES, STATUS> {
        return (getData)=>({
            $update(reducer: IReducer<STATUSES[STATUS]> | STATUSES[STATUS]): STATUSES[STATUS] {
                if (typeof reducer !== 'function') return reducer;
                return (reducer as IReducer<STATUSES[STATUS]>)(getData());
            }
        })
    }

    static createDefaultTransitionDef<STATUSES, STATUS extends keyof STATUSES> ():TransitionsDef<STATUSES> {
        return (()=>({
            $toStatus<STATUS extends keyof STATUSES>(toStatus: StatusLike<STATUSES, STATUS>): Status<STATUSES, STATUS> {
                return StatusLikeParser.parse<STATUSES, STATUS>(toStatus);
            }
        }));
    }

    static createDefaultSteps<
        STATUSES extends BaseStates,
        STATUS extends keyof STATUSES
    > (
        statusName: STATUS,
        flowAnchor: FlowAnchor<STATUSES>,
    ): Steps<STATUSES, STATUS>{
        return this.createSteps <STATUSES, STATUS>(
            statusName,
            flowAnchor,
            this.createDefaultStepsDef<STATUSES, STATUS>()
        )
    }

    static createTransitions<
        STATUSES extends BaseStates,
        STATUS extends keyof STATUSES
    > (
        statusName: STATUS,
        flowAnchor: FlowAnchor<STATUSES>,
        userTransitions?: TransitionsDef<STATUSES>
    ): Transitions<STATUSES> & DefaultTransitionFn<STATUSES>{
        let defaultTransitionDef: TransitionsDef<STATUSES> = this.createDefaultTransitionDef();
        return this.doCreateTransitions(
            statusName,
            flowAnchor,
            userTransitions ? [userTransitions, defaultTransitionDef]: [defaultTransitionDef]
        ) as Transitions<STATUSES> & DefaultTransitionFn<STATUSES>;
    }

    static createSteps<
        STATUSES extends BaseStates,
        STATUS extends keyof STATUSES
    > (
        statusName: STATUS,
        flowAnchor: FlowAnchor<STATUSES>,
        userStepsDef?: StepsDef<STATUSES, STATUS>,
    ): Steps<STATUSES, STATUS> & DefaultStepFn<STATUSES[STATUS]>{
        let defaultStepDef: StepsDef<STATUSES, STATUS> = this.createDefaultStepsDef();
        return this.doCreateSteps(
            statusName,
            flowAnchor,
            userStepsDef ? [userStepsDef, defaultStepDef]: [defaultStepDef]
        ) as Steps<STATUSES, STATUS> & DefaultStepFn<STATUSES[STATUS]>;
    }

    static doCreateSteps<
        STATUSES extends BaseStates,
        STATUS extends keyof STATUSES,
    > (
        statusName: STATUS,
        flowAnchor: FlowAnchor <STATUSES>,
        allStepsDef: StepsDef<STATUSES, STATUS> [],
    ): Steps<STATUSES, STATUS>{
        let dataProducerFn = flowAnchor.getDataFn<STATUS>(statusName);
        let allSteps: Steps<STATUSES, STATUS> = {};
        allStepsDef.forEach(it=>{
            let thisStep = it (dataProducerFn);
            allSteps = {
                ...allSteps,
                ...thisStep
            }
        })
        return this.bindToAnchor<
            STATUSES,
            STATUSES[STATUS],
            STATUS,
            Steps<STATUSES, STATUS>
            >(
            statusName,
            flowAnchor,
            allSteps,
            BindBackType.STEP
        )

    }

    static doCreateTransitions<
        STATUSES extends BaseStates,
        STATUS extends keyof STATUSES,
    > (
        statusName: STATUS,
        flowAnchor: FlowAnchor <STATUSES>,
        allTransitionsDef: TransitionsDef<STATUSES> [],
    ): Transitions<STATUSES>{
        let statusDataProducerFn = flowAnchor.getStatusDataProducerFn();
        let allTransitions: Transitions<STATUSES> = {};
        allTransitionsDef.forEach(it=>{
            let thisTransitions = it (statusDataProducerFn);
            allTransitions = {
                ...allTransitions,
                ...thisTransitions
            }
        })
        return this.bindToAnchor<
            STATUSES,
            STATUSES[STATUS],
            STATUS,
            Transitions<STATUSES>
        >(
            statusName,
            flowAnchor,
            allTransitions,
            BindBackType.TRANSITION
        )
    }


    static bindToAnchor<
        STATUSES extends BaseStates,
        DATA,
        STATUS extends keyof STATUSES,
        TYPE extends Transitions<STATUSES> | Steps<STATUSES, STATUS> = Transitions<STATUSES> | Steps<STATUSES, STATUS>
    > (
        expectedStatusName: STATUS,
        flowAnchor: FlowAnchor<STATUSES>,
        toBind: TYPE,
        type: BindBackType,
    ): TYPE{
        return Proxyfier.proxy(toBind, (originalCall, metadata) => {
            let newState = originalCall();
            flowAnchor.bindBack(expectedStatusName, {
                statusName: flowAnchor.currentStatus.name,
                methodName: metadata.methodName,
                payload: metadata.payload,
                result: newState,
            }, type)
            return newState;
        });
    }

}
