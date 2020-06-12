import {ConanState} from "./conanState";
import {Reducers} from "../conan-thread/domain/reducers";
import {StateDef} from "../conan-thread/domain/stateDef";
import {IReducer, IVarArgConstructor} from "..";
import {Asap} from "../conan-utils/asap";
import {DefaultActionsFn} from "../conan-flow/domain/actions";
import {Monitors} from "../conan-monitor/factories/monitors";

export type DefaultActions<DATA> = { update (reducer: IReducer<DATA> | DATA): Asap<DATA> };
export type DefaultReducers<DATA> = { $update (reducer: IReducer<DATA> | DATA): DATA };

export class Conan {
    static light<DATA>(
        name: string,
        initialData?: DATA
    ): ConanState<DATA, DefaultActionsFn<DATA>> {
        return new ConanState<DATA, DefaultActionsFn<DATA>>(
            Monitors.create<DATA, DefaultReducers<DATA>, DefaultActionsFn<DATA>>({
                name,
                initialData
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
}
