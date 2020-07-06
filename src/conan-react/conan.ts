import {ConanState} from "./conanState";
import {Reducers} from "../conan-thread/domain/reducers";
import {StateDef} from "../conan-thread/domain/stateDef";
import {Flows, IReducer, IVarArgConstructor} from "..";
import {Asap} from "../conan-utils/asap";
import {DefaultActionsFn} from "../conan-flow/domain/actions";
import {Monitors} from "../conan-monitor/factories/monitors";
import {FlowEventNature} from "../conan-flow/domain/flowRuntimeEvents";
import {ThreadFacade} from "../conan-thread/domain/threadFacade";
import {ConanFlow} from "./conanFlow";
import {Mutators, VoidMutators} from "../conan-flow/domain/mutators";
import {UserFlowDef} from "../conan-flow/def/flow/userFlowDef";
import {FlowFacade} from "../conan-flow/domain/flowFacade";
import {UserFlowStatusesDef} from "../conan-flow/def/status/userStatusDef";

export type DefaultActions<DATA> = { update (reducer: IReducer<DATA> | DATA): Asap<DATA> };
export type DefaultReducers<DATA> = { $update (reducer: IReducer<DATA> | DATA): DATA };

export class Conan {
    static light<DATA>(
        name: string,
        initialData?: DATA,
        nature: FlowEventNature = FlowEventNature.MAIN
    ): ConanState<DATA, DefaultActionsFn<DATA>> {
        return new ConanState<DATA, DefaultActionsFn<DATA>>(
            Monitors.create<DATA, DefaultReducers<DATA>, DefaultActionsFn<DATA>>({
                name,
                initialData,
                ... (nature? {nature}: undefined)
            })
        )
    }

    static state<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = any>(
        data: StateDef<DATA, REDUCERS, ACTIONS> | IVarArgConstructor<any>
    ): ConanState<DATA, ACTIONS> {
        return new ConanState<DATA, ACTIONS>(
            Monitors.create<DATA, REDUCERS, ACTIONS>(
                data as any
            )
        )
    }

    static fromThread<DATA, ACTIONS = any>(thread: ThreadFacade<DATA, {}, ACTIONS>) {
        let conanState = Conan.state(thread.getDefinition());
        thread.addReaction({
            name: `pipe`,
            dataConsumer: (data)=>conanState.do.update(data)
        })
        return conanState;
    }

    static flow<USER_STATUSES, USER_MUTATORS extends Mutators<USER_STATUSES> = VoidMutators<USER_STATUSES>, ACTIONS = void> (
        flowDef: UserFlowDef<USER_STATUSES, USER_MUTATORS, ACTIONS>
    ): ConanFlow<USER_STATUSES, USER_MUTATORS, ACTIONS> {
        let conanFlow = new ConanFlow(
            Flows.create<USER_STATUSES, USER_MUTATORS, ACTIONS>(flowDef)
        );
        conanFlow.start();
        return conanFlow;
    }

    static fromFlow<
        STATUSES,
        MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
        ACTIONS = void
    >(flow: FlowFacade<STATUSES, MUTATORS, ACTIONS>) {
        return new ConanFlow(flow);
    }
}
