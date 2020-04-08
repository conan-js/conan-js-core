import * as React from "react";
import { IFunction } from "../conan-utils/typesHelper";
import { Store } from "../conan-sm-sugar/store";
export declare class ReactComponentConnector {
    static connect<ACTIONS, DATA, INTO_PROPS>(name: string, store: Store<any>, ConnectInto: React.ComponentType<INTO_PROPS>, connector: IFunction<{
        data: DATA;
        actions: ACTIONS;
    }, INTO_PROPS>): React.ComponentClass;
}
