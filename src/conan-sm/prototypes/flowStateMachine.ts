import {BaseActions, SmListener} from "../events/stateMachineListeners";
import {State} from "../core/state";
import {StateMachineDefBuilder} from "../core/stateMachineDefBuilder";
import {IFunction} from "../../conan-utils/typesHelper";
import {StateMachine} from "../stateMachine";
import {ForkStateMachineListener} from "./forkStateMachine";
import {Reaction, ReactionType} from "../reactions/reactor";
import {FlowService} from "../services/flowService";
import {Asap, AsapType} from "../../conan-utils/asap";

export interface SetupActions {
    doInit(stateMachine: StateMachine<any>): State<'init', StateMachine<any>>;
}

export interface InitializingActions {
    doDeferredStart(state: State<any>): State<"running">
}

export interface InitActions {
    doStart(initialState: Asap<State<any>>): State<"running"> | State<"initializing">
}

export interface FlowStateMachineListener extends SmListener {
    onInit?: Reaction<InitActions>
    onSetup?: Reaction<SetupActions>
    onRunning?: Reaction<BaseActions<State<any, any>>>
}

export interface FlowStateMachineBuilderParams {
    mainSm: StateMachine<any>,
    thisForkSm: StateMachine<ForkStateMachineListener>
    mainForkSm: StateMachine<ForkStateMachineListener>
}

export let FlowStateMachineBuilder$: IFunction<FlowStateMachineBuilderParams,
    StateMachineDefBuilder<FlowStateMachineListener>> = (params) => {
    let flowService = new FlowService(params.mainSm, params.mainForkSm);
    return (
        new StateMachineDefBuilder<FlowStateMachineListener>()
            .withName(`${params.mainSm.getName()}[flow]`)
            .withState<InitActions, Asap<State<any>>>(
                {
                    name: 'init',
                    paths: () => ({
                        doStart(initialState: Asap<State<any>>): State<"running"> | State<"initializing"> {
                            return initialState.type === AsapType.NOW ?
                                {
                                    name:  "running",
                                    data: initialState.assertNow()
                                } : {
                                    name: "initializing",
                                    data: initialState
                                }
                        }
                    }),
                }
            )
            .withState<InitializingActions, Asap<State<any>>>(
                {
                    name: 'initializing',
                    reactions: [{
                        metadata: {
                            name: '::initializing=>doDeferredStart',
                            executionType: ReactionType.ALWAYS
                        },
                        value: (next)=>next.stateData.consume(nextMainState=>{
                            next.paths.doDeferredStart(nextMainState)
                        })
                    }],
                    paths: ()=> ({
                        doDeferredStart(state: State<any>): State<"running"> {
                            return {
                                data: state,
                                name: "running"
                            }
                        }
                    })
                }
            )
            .withState<void, State<any>>(
                {
                    name: 'running',
                    reactions: [{
                        metadata: {
                            name: '::running->doStartMainSm',
                            executionType: ReactionType.ALWAYS
                        },
                        value: (next)=>{
                            params.mainForkSm.requestState({name: 'idle'})
                            params.mainSm.requestState(next.stateData)
                        }
                    }],
                }
            )
    );
};
