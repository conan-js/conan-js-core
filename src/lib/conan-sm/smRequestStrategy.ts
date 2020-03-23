import {State, StateDef, StateLogicParser} from "./state";
import {EventType} from "./stateMachineLogger";
import {StateMachine} from "./stateMachine";
import {BaseActions, ListenerType} from "./stateMachineListeners";
import {SmTransition} from "./stateMachineEvents";
import {Proxyfier} from "../conan-utils/proxyfier";
import {ForkStateMachineListener} from "./forkStateMachine";

export interface SmRequestStrategy {
    onTransitionRequest(actionName: string, nextState: State): void;

    stateActions(state: State, stateDef: StateDef<any, any, any>): any;
}

export abstract class BaseSmRequestStrategy implements SmRequestStrategy{
    protected constructor(
        protected readonly stateMachine: StateMachine<any>
    ) {}

    public stateActions(state: State, stateDef: StateDef<any, any, any>): any {
        let baseActions: BaseActions = {
            requestTransition: (transition: SmTransition): void => {
                this.stateMachine.requestTransition(transition);
            },
            getStateData: (): any => {
                this.stateMachine.getStateData();
            },
            requestStage: (state: State): void => {
                this.stateMachine.requestStage(state);
            },
        };

        if (stateDef.logic == null) return baseActions;

        let actionsLogic: any = StateLogicParser.parse(stateDef.logic)(state.data);
        let proxied = Proxyfier.proxy(actionsLogic, (originalCall, metadata) => {
            let nextState: State = originalCall();
            this.onTransitionRequest (metadata.methodName, nextState);

            return nextState;
        });
        return Object.assign(proxied, baseActions);
    }

    abstract onTransitionRequest(actionName: string, nextState: State<string, void>): void;
}

export class SimpleSmRequestStrategy extends BaseSmRequestStrategy{
    constructor(
        readonly stateMachine: StateMachine<any>
    ) {
        super(stateMachine);
    }

    onTransitionRequest(actionName: string, nextState: State): void {
        let nextStateDef: StateDef<string, any, any, any> = this.stateMachine.getStateDef(nextState.name);
        if (nextStateDef == null) {
            throw new Error('unexpected error');
        } else if (nextStateDef.deferredInfo != null) {
            throw new Error('unexpected error');
        } else {
            this.stateMachine.log(EventType.PROXY, `(${actionName})=>::${nextState.name}`);
            this.stateMachine.requestTransition({
                transitionName: actionName,
                ...nextState ? {payload: nextState.data} : undefined,
                into: nextState,
            });
        }
    }
}

export class ForkSmRequestStrategy  extends BaseSmRequestStrategy{
    constructor(
        readonly stateMachine: StateMachine<any>,
        private readonly forkSm: StateMachine<ForkStateMachineListener>,
        private readonly otherwise: SmRequestStrategy
    ) {
        super(stateMachine);
    }


    onTransitionRequest(actionName: string, nextState: State): void {
        let nextStateDef: StateDef<string, any, any, any> = this.stateMachine.getStateDef(nextState.name);
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
            this.otherwise.onTransitionRequest(actionName, nextState);
        }
    }

    private startFork() {
        throw new Error('TBI');
    }
}


