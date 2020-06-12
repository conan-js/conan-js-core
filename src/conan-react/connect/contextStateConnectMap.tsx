import * as React from "react";
import {ConnectedState, ReactStateContext, StateConnect, StateConnectProps, StateMapConnect} from "./stateConnect";
import {IBiFunction, IFunction} from "../../index";
import {ConanState} from "../conanState";

export interface ContextStateMapConnectProps<STATE, PROPS, ACTIONS = any> {
    into: React.ComponentType<PROPS>,
    mapper: IBiFunction<STATE, ACTIONS, PROPS>,
    fallbackValue?: IFunction<ACTIONS, PROPS>
}

export class ContextStateMapConnect<STATE, PROPS, ACTIONS = any> extends React.Component<ContextStateMapConnectProps<STATE, PROPS, ACTIONS>> {
    render(): React.ReactElement {
        return <ReactStateContext.Consumer>
            {(reactThread: ConanState<STATE, ACTIONS>) => {
                if (reactThread == null) {
                    throw new Error(`trying to access the state from the context, but it was not found, did you specify the state up in the rendering tree?`);
                }
                return <StateMapConnect from={reactThread} into={this.props.into} mapper={this.props.mapper} fallbackValue={this.props.fallbackValue}/>;
            }}
        </ReactStateContext.Consumer>;
    }
}

export interface ContextStateConnectProps<STATE, ACTIONS=any> {
    into: React.ComponentType<ConnectedState<STATE, ACTIONS>>,
    fallbackValue?: STATE
}


export class ContextStateConnect<STATE, ACTIONS = any> extends React.Component<ContextStateConnectProps<STATE, ACTIONS>> {
    render(): React.ReactElement {
        return <ReactStateContext.Consumer>
            {(reactThread: ConanState<STATE, ACTIONS>) => {
                if (reactThread == null) {
                    throw new Error(`trying to access the state from the context, but it was not found, did you specify the state up in the rendering tree?`);
                }
                return <StateConnect from={reactThread} into={this.props.into} fallbackValue={this.props.fallbackValue}/>;
            }}
        </ReactStateContext.Consumer>;
    }
}
export const contextStateConnect = <STATE, ACTIONS = any >(
    into: React.ComponentType<ConnectedState <STATE, ACTIONS>>,
    fallbackValue?: STATE
): React.ReactElement <StateConnectProps<STATE, ACTIONS>> => {
    return <ContextStateConnect<STATE, ACTIONS> into={into} fallbackValue={fallbackValue}/>;
}

export const contextStateMapConnect = <STATE, PROPS, ACTIONS = any >(
    into: React.ComponentType<PROPS>,
    mapper: IBiFunction<STATE, ACTIONS, PROPS>,
    fallbackValue?: IFunction<ACTIONS, PROPS>
): React.ReactElement <StateConnectProps<STATE, ACTIONS>> => {
    return <ContextStateMapConnect<STATE, PROPS, ACTIONS> into={into} fallbackValue={fallbackValue} mapper={mapper}/>;
}
