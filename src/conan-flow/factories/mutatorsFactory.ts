import {Steps, StepsDef} from "../def/stepsDef";
import {IReducer} from "../../index";
import {DefaultTransitionFn, Transitions, TransitionsDef} from "../domain/transitions";
import {Status, StatusLike, StatusLikeParser} from "../domain/status";
import {BindBackType, FlowAnchor} from "../logic/flowAnchor";
import {Proxyfier} from "../../conan-utils/proxyfier";
import {BaseStates} from "../domain/flow";
import {DefaultStepFn} from "../domain/steps";
import {FlowEventLevel, FlowEventNature, FlowEventSource, FlowEventType} from "../domain/flowRuntimeEvents";

export class MutatorsFactory {
    static createDefaultStepsDef<
        STATUSES extends BaseStates,
        STATUS extends keyof STATUSES
    > (flowAnchor: FlowAnchor<any>):StepsDef<STATUSES, STATUS> {
        return (getData)=>({
            $update(reducer: IReducer<STATUSES[STATUS]> | STATUSES[STATUS]): STATUSES[STATUS] {
                let finalValue: STATUSES[STATUS];
                let flowThread = flowAnchor.currentThread.flowThread;
                let tracker = flowThread.flowOrchestrator.createRuntimeTracker(
                    flowThread.flowController,
                    FlowEventSource.CONTEXT,
                    FlowEventType.USER_CODE,
                    finalValue
                ).start();
                if (typeof reducer !== 'function') {
                    finalValue = reducer;
                }else{
                    finalValue = (reducer as IReducer<STATUSES[STATUS]>)(getData());
                }
                tracker.debug(`$update`, finalValue).end()
                return finalValue;
            }
        })
    }

    static createDefaultTransitionDef<STATUSES, STATUS extends keyof STATUSES> (flowAnchor: FlowAnchor<any>):TransitionsDef<STATUSES> {
        return (()=>({
            $toStatus<STATUS extends keyof STATUSES>(toStatus: StatusLike<STATUSES, STATUS>): Status<STATUSES, STATUS> {
                let status = StatusLikeParser.parse<STATUSES, STATUS>(toStatus);
                let flowThread = flowAnchor.currentThread.flowThread;
                flowThread.flowOrchestrator.createRuntimeTracker(
                    flowThread.flowController,
                    FlowEventSource.CONTEXT,
                    FlowEventType.USER_CODE,
                    status
                ).start().debug(`$toStatus`, status).end();
                return status;
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
            this.createDefaultStepsDef<STATUSES, STATUS>(flowAnchor)
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
        let defaultTransitionDef: TransitionsDef<STATUSES> = this.createDefaultTransitionDef(flowAnchor);
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
        let defaultStepDef: StepsDef<STATUSES, STATUS> = this.createDefaultStepsDef(flowAnchor);
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
            let flowController = flowAnchor.currentThread.flowThread.flowController;
            let tracker = flowAnchor.currentThread.flowThread.flowOrchestrator.createRuntimeTracker(
                flowController,
                FlowEventSource.CONTEXT,
                FlowEventType.USER_REACTIONS,
                flowController.flowDef.nature
            ).start();


            let isMainNature = flowController.flowDef.nature === FlowEventNature.MAIN;
            let level = isMainNature && metadata.methodName !== '$update'? FlowEventLevel.MILESTONE : FlowEventLevel.DEBUG;
            tracker.withLevel(level, `calling: ${metadata.methodName}`, (typeof metadata.payload === "object" ? metadata.payload : '[reducer]'));
            try{
                let newState = originalCall();
                flowAnchor.bindBack(expectedStatusName, {
                    statusName: flowAnchor.currentStatus.name,
                    methodName: metadata.methodName,
                    payload: metadata.payload,
                    result: newState,
                }, type)
                tracker.end();
                return newState;
            } catch (e){
                flowAnchor.createRuntimeTracker(
                    FlowEventType.ERROR_USER_CODE,
                    e
                ).start().milestone(`error running ${metadata.methodName}`, e).end();
                return undefined;
            }
        });
    }

}
