import {ThreadImpl} from "../logic/thread";
import {Flows} from "../../conan-flow/factories/flows";
import {Reducers} from "../domain/reducers";
import {StateDef} from "../domain/stateDef";
import {Flow} from "../../conan-flow/domain/flow";
import {ThreadFacade} from "../domain/threadFacade";
import {AsapParser} from "../../conan-utils/asap";
import {Proxyfier} from "../../conan-utils/proxyfier";
import {MethodFinder} from "../../conan-utils/methodFinder";
import {FlowEventNature} from "../../conan-flow/domain/flowRuntimeEvents";


export interface ThreadFlow<DATA> {
    nextData: DATA
}


export class Threads {
    static create<DATA, REDUCERS extends Reducers<DATA> = {}, ACTIONS = void>(
        data: StateDef<DATA, REDUCERS, ACTIONS>
    ): ThreadFacade<DATA, REDUCERS, ACTIONS> {
        let flow: Flow<ThreadFlow<DATA>, { nextData: REDUCERS }> = Flows.createController<ThreadFlow<DATA>, { nextData: REDUCERS }>({
            name: data.name,
            statuses: {
                nextData: {
                    ...(data.reducers ? {steps: data.reducers} : undefined),
                    ...(data.reactions? {reactions: data.reactions}: undefined),
                }
            },
            ...(!data.hasOwnProperty('initialData') ? undefined : {
                initialStatus: AsapParser.from(data.initialData).map(data => ({
                    name: 'nextData',
                    data
                }))
            }),
            pipelineListener: data.pipelineListener,
            nature: data.nature ? data.nature : FlowEventNature.MAIN
        });

        let threadImpl = new ThreadImpl<DATA, REDUCERS>(flow);

        if (data.actions && data.autoBind) {
            throw new Error(`you can only use actions or autoBind. Both in conjunction is illegal`)
        }

        let threadFacade: ThreadFacade<DATA, REDUCERS, ACTIONS>;
        if (data.autoBind) {
            let methodsToProxy: string[] = [];
            let autoBindWrapper = {...data.autoBind};

            Object.keys(threadImpl.reducers).forEach(reducerWithDollar => {
                let actionName = reducerWithDollar.substring(1, reducerWithDollar.length);
                if (MethodFinder.exists(data.autoBind, actionName)) {
                    autoBindWrapper[actionName] = (...params) => {
                        return data.autoBind[actionName](...params)
                    }
                    methodsToProxy.push(actionName);
                } else {
                    autoBindWrapper[actionName] = (...params) => {
                        return threadImpl.chain(reducers => reducers [reducerWithDollar](...params))
                    }
                }
            })

            threadFacade = new ThreadFacade<DATA, REDUCERS, ACTIONS>(
                threadImpl,
                Proxyfier.proxy(autoBindWrapper, (original, metadata) => {
                    if (methodsToProxy.indexOf(metadata.methodName) === -1) {
                        return original();
                    }
                    return threadImpl.monitor(
                        original(),
                        (value, reducers) => reducers[`$${metadata.methodName}`](value),
                        metadata.methodName,
                        metadata.payload
                    )
                })
            );
        } else {
            let actions: ACTIONS = data.actions ? data.actions(threadImpl) : {} as any;
            Object.keys(threadImpl.reducers).forEach(reducerKey => {
                let matchingActionName: string = reducerKey.substring(1, reducerKey.length);
                if (!actions[matchingActionName]) {
                    actions[matchingActionName] = (...params) => {
                        return threadImpl.chain(reducers => reducers [reducerKey](...params))
                    }
                }
            })
            threadFacade = new ThreadFacade<DATA, REDUCERS, ACTIONS>(
                threadImpl,
                actions
            );
        }

        if (!data.cancelAutoStart) {
            threadFacade.start();
        }

        return threadFacade;
    }
}
