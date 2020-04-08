import {IFunction} from "../../conan-utils/typesHelper";
import {NamedReactions} from "../reactions/reactor";
import {StateLogic} from "../reactions/reactorFactory";


export interface StateDef <
    PATHS,
    DATA = any
> {
    name: string,
    paths?: IFunction<DATA, PATHS>,
    reactions?: NamedReactions<PATHS, DATA>,
    logic?: StateLogic<PATHS>
}
