import * as React from "react";
import {ReactElement} from "react";
import {IBiFunction, IFunction} from "../../index";
import {ConanState} from "../conanState";
import {MonitorInfo, MonitorStatus} from "../../conan-monitor/domain/monitorInfo";
import {ITriFunction} from "../../conan-utils/typesHelper";

export interface ReactWrapperProps<STATE, PROPS, ACTIONS = any> {
    from: ConanState<STATE, ACTIONS>,
    into: React.ComponentType<PROPS>,
    mapper: ITriFunction<STATE, ACTIONS, MonitorInfo, PROPS>,
    fallbackValue?: IFunction<ACTIONS, PROPS>
}

export const ReactStateContext = React.createContext(null);

export class StateMapConnect<STATE, PROPS, ACTIONS = any> extends React.Component<ReactWrapperProps<STATE, PROPS>, PROPS, ACTIONS> {
    private _mainDataReactionLock: any;
    private _asyncDataReactionLock: any;

    private _isMounted: boolean = false;

    private lastMonitorInfo: MonitorInfo = undefined;
    private lastState: STATE = undefined;

    constructor(props: ReactWrapperProps<STATE, PROPS, ACTIONS>) {
        super(props);
        let needsDefault: boolean = true;
        let name: string = this.props.into.prototype ? this.props.into.prototype : this.props.into.name;

        this._mainDataReactionLock = this.props.from.addDataReaction({
            name: `connect | ${name}`,
            dataConsumer: (data) => {
                this.lastState = data;
                let lastProps: PROPS = this.props.mapper(
                    data,
                    {
                        ...this.props.from.actions
                    },
                    this.lastMonitorInfo
                );
                if (this._isMounted){
                    this.setState(lastProps);
                }else {
                    needsDefault = false;
                    this.state = lastProps;
                }
            },
        })
        this._asyncDataReactionLock = this.props.from.addAsyncReaction({
            name: `connect monitor| ${name}`,
            dataConsumer: (monitorInfo) => {
                this.lastMonitorInfo = monitorInfo;
                let lastProps: PROPS = this.props.mapper(
                    this.lastState,
                    {
                        ...this.props.from.actions
                    },
                    monitorInfo
                );
                if (this._isMounted){
                    this.setState(lastProps);
                }else {
                    needsDefault = false;
                    this.state = lastProps;
                }
            }
        });
        if (needsDefault && this.props.fallbackValue){
            this.state = this.props.fallbackValue(this.props.from.actions);
        }
    }



    componentDidMount() {
        this._isMounted = true;
    }

    componentWillUnmount() {
        this._isMounted = false;
        this._mainDataReactionLock.release();
        if (this._asyncDataReactionLock){
            this._asyncDataReactionLock.release();
        }
    }

    render() {
        let Comp: React.ComponentType<PROPS> = this.props.into;
        return (
            <ReactStateContext.Provider value={this.props.from}>
                <Comp
                    {...this.state}
                />
            </ReactStateContext.Provider>
        )
    }
}

export interface ConnectedState <DATA, ACTIONS> {
    data: DATA,
    actions: ACTIONS,
    monitorInfo: MonitorInfo
}


export interface StateConnectProps<STATE, ACTIONS = any> {
    from: ConanState<STATE, ACTIONS>,
    into: React.ComponentType<ConnectedState <STATE, ACTIONS>>,
    fallbackValue?: STATE
}

export const StateConnect = <STATE, ACTIONS = any> (props: StateConnectProps<STATE, ACTIONS>):ReactElement => {
    return (
        <StateMapConnect <STATE, ConnectedState <STATE, ACTIONS>, ACTIONS>
            mapper={(data,actions, monitorInfo)=>({data, actions, monitorInfo})}
            into={props.into}
            from={props.from}
            fallbackValue={(actions)=>({
                data: props.fallbackValue,
                actions,
                monitorInfo: {
                    status: MonitorStatus.IDLE
                }
            })}
        />
    )
}

export const stateConnect = <STATE, ACTIONS = any >(
    from: ConanState<STATE, ACTIONS>,
    into: React.ComponentType<ConnectedState <STATE, ACTIONS>>,
    fallbackValue?: STATE
): React.ReactElement <StateConnectProps<STATE, ACTIONS>> => {
    return <StateConnect<STATE, ACTIONS> from={from} into={into} fallbackValue={fallbackValue}/>;
}

export const stateMapConnect = <STATE, PROPS, ACTIONS = any >(
    from: ConanState<STATE, ACTIONS>,
    into: React.ComponentType<PROPS>,
    mapper: IBiFunction<STATE, ACTIONS, PROPS>,
    fallbackValue?: IFunction<ACTIONS, PROPS>
): React.ReactElement <StateConnectProps<STATE, ACTIONS>> => {
    return <StateMapConnect<STATE, PROPS, ACTIONS> from={from} into={into} fallbackValue={fallbackValue} mapper={mapper}/>;
}
