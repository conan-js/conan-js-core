import {IFunction, IReducer} from "../..";
import {Context} from "./context";
import {Mutators, VoidMutators} from "./mutators";
import {Flow} from "./flow";
import {Asap} from "../../conan-utils/asap";


export type ThenInto<
    STATUSES,
    STATUS extends keyof STATUSES
> = Asap<Context<STATUSES, STATUS, any>>;

export type FlowActionsDef<
    STATUSES,
    MUTATORS extends Mutators<STATUSES> = VoidMutators<STATUSES>,
    ACTIONS = void,
> = IFunction<
    Flow<STATUSES, MUTATORS>,
    ACTIONS
>;

export interface DefaultActionsFn<DATA>{
    update (reducer: IReducer<DATA> | DATA): DATA;
    updateAsap (reducerAsap: IFunction<DATA, Asap<DATA>> | Asap<DATA>, name?: string): Asap<DATA>;
}

