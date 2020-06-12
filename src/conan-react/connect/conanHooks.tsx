import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {IBiFunction, IConsumer, IReducer} from "../../index";
import {Status} from "../../conan-flow/domain/status";
import {Flow} from "../../conan-flow/domain/flow";
import {ConanState} from "../conanState";
import {ReactStateContext} from "./stateConnect";
import {DefaultActions} from "../conan";
import {DefaultActionsFn} from "../../conan-flow/domain/actions";

export function useFlow<USER_STATE = string,
    STATUSES = any
>(
    flow: Flow<STATUSES>,
    setState: IConsumer<IReducer<USER_STATE>>,
    mapper?: IBiFunction<Status<STATUSES>, USER_STATE, USER_STATE>
): void {
    useEffect(() => {
        flow.reactOnStatusChanged(status => {
            setState((previousUserState: USER_STATE) => {
                return mapper ? mapper(status, previousUserState): status.name;
            });
        });
    }, []);
}

export function useFlowStatus<
    USER_STATE,
    STATUSES,
    STATUS extends keyof STATUSES
>(
    flow: Flow<STATUSES>,
    status: STATUS,
    setState: IConsumer<IReducer<USER_STATE>>,
    mapper?: IBiFunction<STATUSES[STATUS], USER_STATE, USER_STATE>
) {
    useEffect(() => {
        flow.alwaysOn(status, context => {
                setState(previousState => {
                    return mapper ? mapper(context.getData(), previousState) : context.getData() as any as USER_STATE;
                });
            }
        );
    }, []);
}


export function useConantState<STATE, ACTIONS = DefaultActionsFn<STATE>> (state: ConanState<STATE, ACTIONS>, fallbackValue?: STATE): [STATE, ACTIONS, React.ComponentType] {
    let lastData = state.getData();
    const [compState, compStateSetter] = useState(lastData == null ? fallbackValue : lastData);

    useEffect(()=>{
        const lock = state.addDataReaction ({
            dataConsumer: compStateSetter,
            name: `useConanState[${state.getName()}]`
        })
        return ()=>lock.release();
    }, [])


    return [compState, state.actions, ({children}: any):React.ReactElement=>{
        return <ReactStateContext.Provider value={state}>
            {children}
        </ReactStateContext.Provider>;
    }];
}


export function useContextConantState<STATE, ACTIONS = DefaultActions<STATE>> (): [STATE, ACTIONS] {
    const state$ = useContext(ReactStateContext);
    let result = useConantState<STATE, ACTIONS> (state$);
    return [result[0], result[1]];
}
