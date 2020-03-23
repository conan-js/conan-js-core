import * as React from "react";
import {Store} from "../conan-store/store";
import {IFunction} from "../conan-utils/typesHelper";
import {ReactElement} from "react";


interface ConnectedState<ACTIONS, DATA> {
    actions: ACTIONS;
    data: DATA;
}

export class ReactComponentConnector {
    static connect<
        ACTIONS,
        DATA,
        INTO_PROPS
        >(
        name: string,
        store: Store<any>,
        ConnectInto: React.ComponentType<INTO_PROPS>,
        connector: IFunction<{ data: DATA, actions: ACTIONS }, INTO_PROPS>
    ): React.ComponentClass {
        class Connector extends React.Component<{}, ConnectedState<ACTIONS, DATA>> {
            private stateMachine = store.addListener([`::nextData->connect`, {
                onNextData: (actions, params) => this.setState({
                    actions,
                    data: params.sm.getStateData()
                })
            }]);

            componentDidMount(): void {
                this.stateMachine.start(name);
            }

            render(): ReactElement {
                if (this.state == null) return null;

                return <ConnectInto
                    {...connector({
                            data: this.state.data,
                            actions: this.state.actions
                        })}
                />;
            }
        }

        return Connector;
    }
}
