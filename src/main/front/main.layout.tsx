import * as React from "react";
import {ReactElement} from "react";
import {BindPipe, ConditionallyBindPipe, Pipe} from "../../lib/pipes/pipes";
import {Aspects, ConanElement} from "../../lib/conan-layout/renderers";
import {Translations} from "../domain/translations";


export interface OverlayLayoutProps {
    translationsPipe: Pipe<Translations>;
    popupPipe: Pipe<ReactElement>;
    mainPipe: Pipe<ReactElement>;
}

export class MainLayout extends React.Component<OverlayLayoutProps> {
    render(): ReactElement {
        return (
            <BindPipe<Translations>
                mergeIntoContext={'translations'}
                pipe={this.props.translationsPipe}
                link={() => (
                    <ConanElement
                        hints={{className: 'appWrapper'}}
                        aspects={[Aspects.withEagerArea()]}
                    >
                        <ConanElement
                            hints={{
                                className: 'appView'
                            }}
                            aspects={[Aspects.withEagerArea()]}
                        >
                            <BindPipe<ReactElement>
                                pipe={this.props.mainPipe}
                            />
                        </ConanElement>

                        <ConditionallyBindPipe
                            renderer={this.popupRenderer.bind(this)}
                            pipe={this.props.popupPipe}
                        />
                    </ConanElement>
                )}
            />
        );
    }

    private popupRenderer(popupView: ReactElement): ReactElement {
        return (
            <ConanElement
                hints={{
                    className: 'popupView'
                }}
                aspects={[
                    Aspects.withEagerArea(),
                    Aspects.withAbsoluteTopLeftPosition(),
                    Aspects.withCenteredContent()
                ]}
            >
                {popupView}
            </ConanElement>
        );
    }

}
