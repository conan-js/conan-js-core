import {State, StateDef, StateLogicParser} from "./state";
import {EventType} from "./stateMachineLogger";
import {StateMachineController} from "./stateMachineController";
import {ListenerDefType, ListenerMetadata, StageToProcess} from "./stateMachine";
import {WithMetadataArray} from "../conan-utils/typesHelper";
import {BaseActions, ListenerType, OnEventCallback} from "./stateMachineListeners";
import {SmTransition} from "./stateMachineEvents";
import {Strings} from "../conan-utils/strings";
import {Proxyfier} from "../conan-utils/proxyfier";
import base = Mocha.reporters.base;


export interface SmOrchestrator {
    onActionTriggered(actionName: string, nextState: State): void;

    moveToState(state: State): void;

    createStateReactions(state: State): any;

    createTransitionReactions(transition: SmTransition): any;

    onReactionsProcessed(reactionsProcessed: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, type: ListenerDefType): any;

    moveToAction(transition: SmTransition): void;
}

export class SimpleOrchestrator implements SmOrchestrator {
    constructor(
       private readonly statesController: StateMachineController<any>,
    ) {}

    onActionTriggered(actionName: string, nextState: State) {
        let nextStateDef: StateDef<string, any, any, any> = this.statesController.getStateDef(nextState.name);
        if (nextStateDef == null) {
            throw new Error('TBI');
        } else if (nextStateDef.deferredInfo != null) {
            throw new Error('TBI');
        } else {
            this.statesController.log(EventType.PROXY, `(${actionName})=>::${nextState.name}`);
            this.statesController.requestTransition({
                transitionName: actionName,
                ...nextState ? {payload: nextState.data} : undefined,
                into: nextState,
            });

        }
    }

    moveToState(state: State): void {
        this.statesController.log(EventType.TR_OPEN);
        this.statesController.moveToState(state);
    }

    createStateReactions(state: State): any {
        let eventName = Strings.camelCaseWithPrefix('on', state.name);
        return this.createReactions(
            eventName,
            ListenerDefType.LISTENER,
            this.stateActions(state, this.statesController.getStateDef(state.name))
        )
    }

    createTransitionReactions(transition: SmTransition): any {
        return this.createReactions(
            Strings.camelCaseWithPrefix('on',  transition.transitionName),
            ListenerDefType.INTERCEPTOR,
            {}
        )
    }

    createReactions(eventName: string, type: ListenerDefType, actions: any): any {
        return this.reactionsAsCallbacks(this.statesController.createReactions(eventName, type), actions)
    }

    onReactionsProcessed(reactionsProcessed: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, type: ListenerDefType): any {
        this.deleteOnceListenersUsed(reactionsProcessed, type)
    }

    moveToAction(transition: SmTransition): void {
        this.statesController.log(EventType.TR_OPEN);
        this.statesController.moveToAction(transition);
    }

    private reactionsAsCallbacks(reactions: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, actions: any) {
        return reactions.map(it => ({
            metadata: it.metadata,
            value: () => it.value(actions)
        }));
    }

    private deleteOnceListenersUsed(reactionsProcessed: WithMetadataArray<OnEventCallback<any>, ListenerMetadata>, type: ListenerDefType) {
        this.statesController.deleteListeners(
            reactionsProcessed
                .filter(it => it.metadata.executionType === ListenerType.ONCE)
                .map(it => it.metadata.name)
            , type);
    }

    private stateActions(state: State, stateDef: StateDef<any, any, any>): any {
        let baseActions: BaseActions = {
            requestTransition: (transition: SmTransition): void => {
                this.statesController.requestTransition(transition);
            },
            getStateData: (): any => {
                this.statesController.getStateData();
            },
            requestStage: (stageToProcess: StageToProcess): void => {
                this.statesController.requestStage(state);
            },
            stop: (): void => {
                throw new Error('TBI')
            }
        };

        if (stateDef.logic == null) return baseActions;

        let actionsLogic: any = StateLogicParser.parse(stateDef.logic)(state.data);
        let proxied = Proxyfier.proxy(actionsLogic, (originalCall, metadata) => {
            let nextState: State = originalCall();
            this.onActionTriggered (metadata.methodName, nextState);

            return nextState;
        });
        return Object.assign(proxied, baseActions);

    }




    // private createFork(deferredInfo: DeferredInfo<any, any>): void {
    //     this.flowController.runNow({
    //         onProcessingAction: (actions)=> {
    //             this.flowController.addListener({
    //                 onForking: (actions)=>{
    //                     this.stateMachineTree$ ({
    //                         rootDef: {
    //                             name: undefined,
    //                             interceptors: [],
    //                             listeners: [],
    //                             stageDefsByKey: {}
    //                         },
    //                         syncDefs: []
    //                     })
    //                 }
    //             }, ListenerType.ONCE);
    //             return actions.fork();
    //         }
    //     });
    // }

}
