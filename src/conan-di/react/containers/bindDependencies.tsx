import * as React from "react";
import {IFunction} from "../../../conan-utils/typesHelper";
import {MountContext} from "./mountContext";

interface InjectProps<C> {
    link: IFunction<C, React.ReactElement>
}

export class BindDependencies<C> extends React.Component <InjectProps<C>> {
    render(): React.ReactElement {
        return (
            <MountContext.Context.Consumer>
                {(context: C) => this.props.link(context)}
            </MountContext.Context.Consumer>

        );
    }
}
