import {State} from "../core/state";
import {Strings} from "../../conan-utils/strings";
import {Proxyfier} from "../../conan-utils/proxyfier";
import {EventType} from "../logging/stateMachineLogger";
import {SmOrchestrator} from "../wiring/smOrchestrator";
import {StateMachineController} from "../stateMachineController";
import {Reactor, ReactorImpl} from "./reactor";
import {theForkService} from "../wiring/singletons";
import {StateDef} from "../core/stateDef";
import {IConstructor, IFunction, IProducer} from "../../conan-utils/typesHelper";

export type PathsDefLike<ACTIONS, DATA = void> = IConstructor<ACTIONS, any> | IFunction<DATA, ACTIONS>;

export class PathsParser {
    static parse<ACTIONS, DATA = void>(toParse: PathsDefLike<ACTIONS, DATA>): IFunction<DATA, ACTIONS> {
        if (PathsParser.isConstructorType<ACTIONS, DATA>(toParse)) {
            return (data) => new toParse(data);
        }

        return toParse;
    }

    static isConstructorType<ACTIONS, DATA>(toTransform: PathsDefLike<ACTIONS, DATA>): toTransform is IConstructor<ACTIONS, any> {
        return (PathsParser.isConstructor(toTransform));
    }


    static isConstructor(obj: object): boolean {
        // @ts-ignore
        return !!obj.prototype && !!obj.prototype.constructor.name;
    }
}

export type StateLogicFunction<PAYLOAD> = IFunction<PAYLOAD , PAYLOAD | void | Promise<PAYLOAD>>
export type StateLogicProvider<PAYLOAD> = IProducer<PAYLOAD | void | Promise<PAYLOAD>>
export type StateLogicCall<PAYLOAD> = StateLogicFunction<PAYLOAD> | StateLogicProvider<PAYLOAD>;


export type StateLogic<
    ACTIONS_INTERFACE,
    PAYLOAD = any
> = { [N in keyof ACTIONS_INTERFACE]: StateLogicCall<PAYLOAD> };

export class ReactorFactory {
    public static createStateReactors<PATHS = any, DATA = any, DEFERRER = any>(
        stateMachineController: StateMachineController<any>,
        state: State<string, DATA>,
        stateDef: StateDef<any>,
        orchestrator: SmOrchestrator,
    ): Reactor<PATHS, DATA, DEFERRER> {
        let paths: PATHS;
        if (stateDef.paths != null) {
            let logicCallback = PathsParser.parse(stateDef.paths);
            let nextStateData: any = logicCallback(state.data);
            if (nextStateData == null) {
                let eventName: string = Strings.camelCaseWithPrefix('on', state.name);
                console.error('providing actions for this state', nextStateData);
                throw new Error(`it looks like the logic provided in a listener for: ${stateMachineController.getName()}::${eventName} is not returning a valid set of actions to allow this state to progress` )
            }
            paths = Proxyfier.proxy(nextStateData, (originalCall, metadata) => {
                let nextState: State = originalCall();
                stateMachineController.log(EventType.PROXY, `(${metadata.methodName})=>::${nextState.name}`);
                orchestrator.onTransitionRequestFromActions(stateMachineController, metadata.methodName, nextState, metadata.payload);

                return nextState;
            });
        }
        return new ReactorImpl <PATHS, DATA, DEFERRER>(
            state,
            paths,
            stateDef.logic as any,
            stateMachineController.getEvents(),
            theForkService,
            stateMachineController
        )
    }

}
