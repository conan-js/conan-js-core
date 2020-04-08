import {SmListener, SmListenerDefLike} from "../events/stateMachineListeners";
import {Strings} from "../../conan-utils/strings";
import {StateLogic} from "./reactorFactory";

export class ReactionParser {
    static parse<ACTIONS = any, SM_ON_LISTENER extends SmListener= any> (toParse: StateLogic<ACTIONS>): SmListenerDefLike<SM_ON_LISTENER>{
        let prototype = Object.getPrototypeOf(toParse);
        let listener: SmListener<SM_ON_LISTENER> = {};
        let result: SmListenerDefLike<SM_ON_LISTENER> = [`${prototype.constructor.name}`, listener as any];
        Object.getOwnPropertyNames(prototype).forEach(name=>{
            if (name === 'constructor') return;
            let propertyValue = toParse[name];
            let eventName = Strings.camelCaseWithPrefix('on', name);


            if (typeof propertyValue !== "function") return;
            listener [eventName] = (...params)=> (toParse as any)[name] (...params)
        });

        return result;
    }
}
