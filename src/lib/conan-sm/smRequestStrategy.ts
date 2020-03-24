import {DeferredInfo, State, StateDef, StateLogicParser} from "./state";
import {EventType} from "./stateMachineLogger";
import {StateMachine} from "./stateMachine";
import {BaseActions, ListenerType} from "./stateMachineListeners";
import {SmTransition} from "./stateMachineEvents";
import {Proxyfier} from "../conan-utils/proxyfier";
import {ForkStateMachineListener} from "./forkStateMachine";
import {TransactionTree} from "../conan-tx/transactionTree";

export interface SmRequestStrategy {
    onTransitionRequest(stateMachine: StateMachine<any>, actionName: string, nextState: State, payload?: any): void;

    stateActions(stateMachine: StateMachine<any>, state: State, stateDef: StateDef<any, any, any>): any;
}

export abstract class BaseSmRequestStrategy implements SmRequestStrategy{
    public stateActions(stateMachine: StateMachine<any>, state: State, stateDef: StateDef<any, any, any>): any {
        let baseActions: BaseActions = {
            getStateName (): string{
                return stateMachine.getStateName();
            },
            requestTransition: (transition: SmTransition): void => {
                stateMachine.log(EventType.PROXY, `(${transition.transitionName})=>::${transition.into.name}`);
                stateMachine.requestTransition(transition);
            },
            getStateData: (): any => {
                return stateMachine.getStateData();
            },
            requestStage: (state: State): void => {
                stateMachine.log(EventType.PROXY, `::${state.name}`);
                stateMachine.requestStage(state);
            },
        };

        if (stateDef.logic == null) return baseActions;

        let actionsLogic: any = StateLogicParser.parse(stateDef.logic)(state.data);
        let proxied = Proxyfier.proxy(actionsLogic, (originalCall, metadata) => {
            let nextState: State = originalCall();
            stateMachine.log(EventType.PROXY, `(${metadata.methodName})=>::${nextState.name}`);
            this.onTransitionRequest (stateMachine, metadata.methodName, nextState, metadata.payload);

            return nextState;
        });
        return Object.assign(proxied, baseActions);
    }

    abstract onTransitionRequest(stateMachine: StateMachine<any>, actionName: string, nextState: State, payload?: any): void;
}

export class SimpleSmRequestStrategy extends BaseSmRequestStrategy{
    onTransitionRequest(stateMachine: StateMachine<any>, actionName: string, nextState: State, payload?: any): void {
        let nextStateDef: StateDef<string, any, any, any> = stateMachine.getStateDef(nextState.name);
        if (nextStateDef == null) {
            throw new Error('unexpected error');
        } else if (nextStateDef.deferredInfo != null) {
            throw new Error('unexpected error');
        } else {
            stateMachine.requestTransition({
                transitionName: actionName,
                ...payload ? {payload: payload} : undefined,
                into: nextState,
            });
        }
    }
}

export class ForkSmRequestStrategy  extends BaseSmRequestStrategy{
    constructor(
        private readonly forkSm: StateMachine<ForkStateMachineListener>,
        private readonly otherwise: SmRequestStrategy,
        private readonly txTree: TransactionTree,
    ) {
        super();
    }


    onTransitionRequest(stateMachine: StateMachine<any>, actionName: string, nextState: State, payload?: any): void {
        let nextStateDef: StateDef<string, any, any, any> = stateMachine.getStateDef(nextState.name);
        if (nextStateDef == null) {
            throw new Error('TBC');
        } else if (nextStateDef.deferredInfo != null) {
            this.forkSm.runNow({
                onIdle: (actions)=> {
                    this.forkSm.addListener(['::forking=>doStartFork',{
                        onForking: (forkingData)=> this.startFork (actions.getStateData())
                    }], this.txTree, ListenerType.ONCE);
                    actions.startForking (nextStateDef.deferredInfo)
                }
            });

        } else {
            this.otherwise.onTransitionRequest(stateMachine, actionName, nextState, payload);
        }
    }

    private startFork(deferredInfo: DeferredInfo<any>) {
        // StateMachineFactory.create({
        //     rootDef: new StateMachineCoreImpl(new StateMachineDefBuilder().build()),
        //     syncDefs: undefined
        // })
        throw new Error('TBI');
    }
}


