import { SmListener, SmListenerDefLike } from "../events/stateMachineListeners";
import { StateLogic } from "./reactorFactory";
export declare class ReactionParser {
    static parse<ACTIONS = any, SM_ON_LISTENER extends SmListener = any>(toParse: StateLogic<ACTIONS>): SmListenerDefLike<SM_ON_LISTENER>;
}
