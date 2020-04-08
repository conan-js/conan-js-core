import * as React from "react";
import {ReactElement} from "react";
import {IFunction} from "../conan-utils/typesHelper";
import {Store} from "../conan-sm-sugar/store";
import {ReactionType, Reactor} from "../conan-sm/reactions/reactor";


interface ConnectedState<ACTIONS, DATA> {
    actions: ACTIONS;
    data: DATA;
    stateName: string;
}

export class ReactComponentConnector {
    static connect<ACTIONS,
        DATA,
        INTO_PROPS>(
        name: string,
        store: Store<any>,
        ConnectInto: React.ComponentType<INTO_PROPS>,
        connector: IFunction<{ data: DATA, actions: ACTIONS }, INTO_PROPS>
    ): React.ComponentClass {
        class Connector extends React.Component<{}, ConnectedState<ACTIONS, DATA>> {
            private store: Store<ACTIONS>;

            componentDidMount(): void {
                this.store = store;
                store.addListener([`::nextData->connect`, {
                    onNextData: this.onNextDataToProcess.bind(this)
                }], ReactionType.ALWAYS);
                store.runIf([`!::nextData-connect`,{
                    onNextData:  this.onNextDataToProcess.bind(this)
                }])
            }

            onNextDataToProcess (next: Reactor<ACTIONS, DATA>): void {
                this.setState({
                    data: next.stateData,
                    stateName: next.stateName,
                    actions: next.paths,
                })
            }

            render(): ReactElement {
                if (this.state == null || this.state.stateName !== 'nextData') return null;

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
