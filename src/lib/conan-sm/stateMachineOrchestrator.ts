import {DeferredInfo, State, StateDef} from "./state";
import {EventType} from "./stateMachineLogger";
import {StateMachineController} from "./stateMachineController";
import {FlowStateMachineListener} from "./flowStateMachine";
import {IFunction} from "../conan-utils/typesHelper";
import {StateMachineTreeDef} from "./stateMachineTreeDef";
import {StateMachineTree} from "./stateMachineTree";

export class StateMachineOrchestrator {
    constructor(
       private readonly controller: StateMachineController<any, any>,
       private readonly smFlowController: StateMachineController<FlowStateMachineListener, any>,
       private readonly stateMachineTree$: IFunction<StateMachineTreeDef<any, any>, StateMachineTree<any>>
    ) {}

    onResume(): void {
    }

    onSleep(): void {
    }

    onActionTriggered(actionName: string, nextState: State) {
        let nextStateDef: StateDef<string, any, any, any> = this.controller.getStateDef(nextState.name);
        if (nextStateDef == null) {
            throw new Error('TBI');
        } else if (nextStateDef.deferredInfo != null) {
            this.createFork (nextStateDef.deferredInfo)
        } else {
            this.controller.log(EventType.PROXY, `(${actionName})=>::${nextState.name}`);
            this.controller.requestTransition({
                transitionName: actionName,
                ...nextState ? {payload: nextState.data} : undefined,
                into: nextState,
            });

        }
    }

    private createFork(deferredInfo: DeferredInfo<any, any>): void {
        this.smFlowController.runNow({
            onProcessingAction: (actions)=> {
                this.smFlowController.addListener({
                    onForking: (actions)=>{
                        this.stateMachineTree$ ({
                            rootDef: {
                                name: undefined,
                                interceptors: [],
                                listeners: [],
                                stageDefsByKey: {}
                            },
                            syncDefs: []
                        })
                    }
                });
                return actions.fork();
            }
        });
    }
}
