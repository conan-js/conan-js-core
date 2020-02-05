import * as React from "react";
import {ReactElement} from "react";
import {IFunction, IProducer, IReducer} from "../conan-utils/typesHelper";

export interface ConanElementHints {
    className: string;
}

export type Aspect = IFunction<ConanElementHints, ConanElementHints>;

export interface ConanElementProps {
    hints?: ConanElementHints;
    aspects?: Aspect []
}

export class ConanElement extends React.Component<ConanElementProps> {
    render (): ReactElement {
        return null;
    }
}


export class Aspects {
    public static withBackgroundImage (img: any): Aspect {
        return null;
    }

    public static withAbsoluteTopLeftPosition (): Aspect {
        return null;
    }

    public static withCenteredContent (): Aspect {
        return null;
    }

    public static withEagerArea (): Aspect {
        return null;
    }
}

export type Condition = [IProducer<boolean>, IReducer<ReactElement>];

export interface ConditionalRendererProps {
    conditions: Condition[];
}

export function ConditionalRenderer (props: ConditionalRendererProps): ReactElement {
    return null;
}


export function FlexColumnsRenderer (props: any): ReactElement {
    return null;
}

export class FlexColumnRenderer extends React.Component {
    render(): ReactElement {
        return null;
    }
}
