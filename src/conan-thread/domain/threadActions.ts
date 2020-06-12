import {IFunction} from "../..";
import {ThreadImpl} from "../logic/thread";
import {Reducers} from "./reducers";
import {Asap} from "../../conan-utils/asap";

export type Then<DATA> = Asap<DATA>

export type ActionsFn<
    DATA,
    MUTATORS extends Reducers<DATA> = {},
    ACTIONS = void,
> = IFunction<
    ThreadImpl<DATA, MUTATORS>,
    ACTIONS
>;

