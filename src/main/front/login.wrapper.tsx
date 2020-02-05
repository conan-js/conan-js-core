import * as React from "react";
import {ReactElement} from "react";
import {FlexColumnRenderer, FlexColumnsRenderer} from "../../lib/conan-layout/renderers";
import {SectionWrapper} from "./section.wrapper";
import {ExpandedImageElement} from "./expandedImage.element";
import {LoginDatums} from "./login.datums";
import {Translations} from "../domain/translations";

interface LoginWrapperProps {
    _s: Translations;
}

export function LoginWrapper (props: LoginWrapperProps): ReactElement {
    return (
        <FlexColumnsRenderer>
            <FlexColumnRenderer>
                <ExpandedImageElement backgroundImg={null}/>>
            </FlexColumnRenderer>
            <FlexColumnRenderer>
                <SectionWrapper
                    title={props._s.existing_user}>
                    <LoginDatums/>>
                </SectionWrapper>
                <SectionWrapper
                    title={props._s.register_new_user}
                />
            </FlexColumnRenderer>
        </FlexColumnsRenderer>
    );
}
