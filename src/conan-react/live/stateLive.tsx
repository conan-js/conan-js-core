import * as React from "react";
import {ReactElement} from "react";
import {IBiFunction} from "../../index";
import {ConanState} from "../conanState";
import {ConnectedState, StateConnect} from "../connect/stateConnect";
import {ContextStateConnect} from "../connect/contextStateConnectMap";

export interface ContextStateLiveProps<STATE, ACTIONS = any> {
    renderer: IBiFunction<STATE, ACTIONS, ReactElement>,
    fallbackValue?: STATE
}


export interface StateLiveProps<STATE, ACTIONS = any> {
    from: ConanState<STATE, ACTIONS>,
    renderer: IBiFunction<STATE, ACTIONS, ReactElement | ReactElement[]>,
    fallbackValue?: STATE
}

export const ContextStateLive = <STATE, ACTIONS = any> (props: ContextStateLiveProps<STATE, ACTIONS>):ReactElement => {
    const LiveRenderer = (propsLive: ConnectedState<STATE, ACTIONS>):React.ReactElement => {
        return props.renderer(propsLive.data, propsLive.actions);
    }
    return (
        <ContextStateConnect<STATE, ACTIONS> into={LiveRenderer} fallbackValue={props.fallbackValue}/>
    )
}

export const StateLive = <STATE, ACTIONS = any> (props: StateLiveProps<STATE, ACTIONS>):ReactElement => {
    const LiveRenderer = (propsLive: ConnectedState<STATE, ACTIONS>):React.ReactElement => {
        let result = props.renderer(propsLive.data, propsLive.actions);
        return Array.isArray(result) ? (<>{result}</>) : result;
    }
    return (
        <StateConnect<STATE, ACTIONS> from={props.from} into={LiveRenderer} fallbackValue={props.fallbackValue}/>
    )
}

export const contextStateLive = <STATE, ACTIONS = any >(
    renderer: IBiFunction<STATE, ACTIONS, ReactElement | ReactElement[]>,
    fallbackValue?: STATE
): React.ReactElement <ConnectedState<STATE, ACTIONS>> => {
    const LiveRenderer = (props: ConnectedState<STATE, ACTIONS>):React.ReactElement => {
        let result = renderer(props.data, props.actions);
        return Array.isArray(result) ? (<>{result}</>) : result;
    }
    return <ContextStateConnect<STATE, ACTIONS> into={LiveRenderer} fallbackValue={fallbackValue}/>;
}

export const stateLive = <STATE, ACTIONS = any >(
    from: ConanState<STATE, ACTIONS>,
    renderer: IBiFunction<STATE, ACTIONS, ReactElement | ReactElement[]>,
    fallbackValue?: STATE
): React.ReactElement <ConnectedState<STATE, ACTIONS>> => {
    const LiveRenderer = (props: ConnectedState<STATE, ACTIONS>):React.ReactElement => {
        let result = renderer(props.data, props.actions);
        return Array.isArray(result) ? (<>{result}</>) : result;
    }
    return <StateConnect<STATE, ACTIONS> from={from} into={LiveRenderer} fallbackValue={fallbackValue}/>;
}

