import { State } from "../core/state";
import { SmOrchestrator } from "../wiring/smOrchestrator";
import { StateMachineController } from "../stateMachineController";
import { Reactor } from "./reactor";
import { StateDef } from "../core/stateDef";
import { IConstructor, IFunction } from "../../conan-utils/typesHelper";
export declare type PathsDefLike<ACTIONS, DATA = void> = IConstructor<ACTIONS, any> | IFunction<DATA, ACTIONS>;
export declare class PathsParser {
    static parse<ACTIONS, DATA = void>(toParse: PathsDefLike<ACTIONS, DATA>): IFunction<DATA, ACTIONS>;
    static isConstructorType<ACTIONS, DATA>(toTransform: PathsDefLike<ACTIONS, DATA>): toTransform is IConstructor<ACTIONS, any>;
    static isConstructor(obj: object): boolean;
}
export declare type StateLogic<ACTIONS_INTERFACE, PAYLOAD = any> = {
    [N in keyof ACTIONS_INTERFACE]: IFunction<PAYLOAD, PAYLOAD | void | Promise<PAYLOAD>>;
};
export declare class ReactorFactory {
    static createStateReactors<PATHS = any, DATA = any>(stateMachineController: StateMachineController<any>, state: State<string, DATA>, stateDef: StateDef<any>, orchestrator: SmOrchestrator): Reactor<PATHS, DATA>;
}
