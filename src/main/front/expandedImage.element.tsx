import {Aspects, ConanElement, ConanElementHints} from "../../lib/conan-layout/renderers";
import * as React from "react";
import {ImageResource} from "../lib/resources/resources";

export interface AppBackgroundElementProps {
    backgroundImg: ImageResource;
    hints?: ConanElementHints;
}

export function ExpandedImageElement (props: AppBackgroundElementProps) {
    return (
        <ConanElement
            hints={{...props.hints}}
            aspects={[
                Aspects.withBackgroundImage(
                    props.backgroundImg
                ),
                Aspects.withEagerArea()
            ]}
        />
    );

}
