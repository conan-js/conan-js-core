import {State, StateDef, StateLogicParser} from "./state";
import {EventType} from "./stateMachineLogger";
import {StateMachine} from "./stateMachine";
import {BaseActions, ListenerType} from "./stateMachineListeners";
import {SmTransition} from "./stateMachineEvents";
import {Proxyfier} from "../conan-utils/proxyfier";
import {ForkStateMachineListener} from "./forkStateMachine";

export interface SmRequestStrategy {
    onTransitionRequest(stateMachine: StateMachine<any>, actionName: string, nextState: State): void;

    stateActions(stateMachine: StateMachine<any>, state: State, stateDef: StateDef<any, any, any>): any;
}

export abstract class BaseSmRequestStrategy implements SmRequestStrategy{
    public stateActions(stateMachine: StateMachine<any>, state: State, stateDef: StateDef<any, any, any>): any {
        let baseActions: BaseActions = {
            requestTransition: (transition: SmTransition): void => {
                stateMachine.requestTransition(transition);
            },
            getStateData: (): any => {
                stateMachine.getStateData();
            },
            requestStage: (state: State): void => {
                stateMachine.requestStage(state);
            },
        };

        if (stateDef.logic == null) return baseActions;

        let actionsLogic: any = StateLogicParser.parse(stateDef.logic)(state.data);
        let proxied = Proxyfier.proxy(actionsLogic, (originalCall, metadata) => {
            let nextState: State = originalCall();
            this.onTransitionRequest (stateMachine, metadata.methodName, nextState);

            return nextState;
        });
        return Object.assign(proxied, baseActions);
    }

    abstract onTransitionRequest(stateMachine: StateMachine<any>, actionName: string, nextState: State<string, void>): void;
}

export class SimpleSmRequestStrategy extends BaseSmRequestStrategy{
    onTransitionRequest(stateMachine: StateMachine<any>, actionName: string, nextState: State): void {
        let nextStateDef: StateDef<string, any, any, any> = stateMachine.getStateDef(nextState.name);
        if (nextStateDef == null) {
            throw new Error('unexpected error');
        } else if (nextStateDef.deferredInfo != null) {
            throw new Error('unexpected error');
        } else {
            stateMachine.log(EventType.PROXY, `(${actionName})=>::${nextState.name}`);
            stateMachine.requestTransition({
                transitionName: actionName,
                ...nextState ? {payload: nextState.data} : undefined,
                into: nextState,
            });
        }
    }
}

export class ForkSmRequestStrategy  extends BaseSmRequestStrategy{
    constructor(
        private readonly forkSm: StateMachine<ForkStateMachineListener>,
        private readonly otherwise: SmRequestStrategy
    ) {
        super();
    }


    onTransitionRequest(stateMachine: StateMachine<any>, actionName: string, nextState: State): void {
        let nextStateDef: StateDef<string, any, any, any> = stateMachine.getStateDef(nextState.name);
        if (nextStateDef == null) {
            throw new Error('TBC');
        } else if (nextStateDef.deferredInfo != null) {
            this.forkSm.runNow({
                onIdle: (actions)=> {
                    this.forkSm.addListener(['!${forking}',{
                        omForking: (forkingData)=> this.startFork ()
                    }], ListenerType.ONCE);
                    actions.startForking ({})
                }
            });

        } else {
            this.otherwise.onTransitionRequest(stateMachine, actionName, nextState);
        }
    }

    private startFork() {
        throw new Error('TBI');
    }
}


