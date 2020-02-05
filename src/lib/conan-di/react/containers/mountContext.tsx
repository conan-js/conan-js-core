import * as React from "react";
import {DiContextDef} from "../../core/diDomain";
import {DiContextFactory} from "../../core/diContext";
import {Context} from "react";


export interface MountDiProps <C> {
    diDef: DiContextDef<C>;
    stateDef?: any;
    flowController?: any;
    routingDef?: any;
}

export class MountContext<C> extends React.Component <MountDiProps<C>> {
    public static readonly Context:Context<any> =React.createContext<any>({});

    render(): React.ReactElement {
        return (
            <MountContext.Context.Provider value={
                DiContextFactory.createContext(this.props.diDef)
            }>
                {this.props.children}
            </MountContext.Context.Provider>
        );
    }
}

