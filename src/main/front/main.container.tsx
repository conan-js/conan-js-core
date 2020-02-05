import * as React from "react";
import {ReactElement} from "react";
import {CredentialsContainer} from "./credentials.container";
import {AppView} from "./app.view";
import {MainLayout} from "./main.layout";
import {ExpandedImageElement} from "./expandedImage.element";
import {Endpoint} from "../../lib/endpoint/endpoints";
import {LanguageCode, LanguageCodes} from "../domain/types";
import {Pipe, Pipes, Stream} from "../../lib/conan-pipes/pipes";
import {MainSmFactory} from "../sm/main/main.sm";
import {Translations} from "../domain/translations";
import {
    AuthenticationSm,
    AuthenticationSmFactory,
    AuthenticationSmJoiner,
    AuthenticationSmListener
} from "../sm/authentication/authentication.sm";

export interface MainContainerConfig {
    backgroundImg: any;
    translationsEndpoint: Endpoint<LanguageCode, Translations>,
    authenticationSm: AuthenticationSm
}

export type MainContainerProps = any;

export class MainContainer extends React.Component <MainContainerConfig> {
    constructor(props: MainContainerConfig) {
        super(props);
    }

    render(): ReactElement {
        let userPipe: Pipe<User> = Pipes.createPipe('popupPipe');
        let mainViewPipe: Pipe<ReactElement> = Pipes.createPipe('mainViewPipe');
        let translationsPipe: Pipe<Translations> = Pipes.createPipe('translations');



        new MainSmFactory().create(
            (actions) => this.props.translationsEndpoint
                .next(LanguageCodes.EN_UK)
                .then((translations) => actions.doInitialise(translations))
        ).while({
            onDoInitialise: {
                withPayload: (translations) => {
                    translationsPipe.push(translations);
                }
            },
            onShowingLogin: {
                then: ()=>{
                    let popupStream: Stream<ReactElement> = popupPipe.createStream('loginPopupStream');
                    mainViewPipe.push(this.renderLoginBackground());
                    popupStream.open(this.renderLogin(
                        {
                            enteringCredentials: () => ({
                                onAccessTokenSuccess: (appCredentials) => {
                                    popupStream.close();
                                    authenticationOrc.joinUsingApp(appCredentials);
                                }
                            }),
                        }
                    ));
                }
            },
            onDoShowApp: {
                then:
            }
        }).sync <AuthenticationSmListener, AuthenticationSmJoiner>(
            'authentication',
            this.props.authenticationSm,
            {
            onNotAuthenticated: {
                ifShowingApp: {
                    thenRequest: (mainActions) => mainActions.doShowLogin()
                }
            },
            onAuthenticated: {
                ifShowingLogin: {
                    thenRequest: (mainActions) => mainActions.doShowApp()
                }
            }
        }).start('main');


        new AuthenticationSmFactory().create(
            (userNameAndPassword) => (actions) => actions.doSuccess({}), initialStageCb
        ).joinPaths((authenticationOrc) => ({
            initializing: (translateEndpoint, next) => {
                translateEndpoint
                    .next(LanguageCodes.EN_UK)
                    .then((translations) => next(translations).joinDoingLogin());
            },
            doingLogin: () => {
                let popupStream: Stream<ReactElement> = popupPipe.createStream('loginPopupStream');
                mainViewPipe.push(this.renderLoginBackground());
                popupStream.open(this.renderLogin(
                    {
                        enteringCredentials: () => ({
                            onAccessTokenSuccess: (appCredentials) => {
                                popupStream.close();
                                authenticationOrc.joinUsingApp(appCredentials);
                            }
                        }),
                    }
                ));
            },
            usingApp: (appCredentials) => {
                mainViewPipe.push(this.renderApp(appCredentials));
            },
        }));

        return (
            <MainLayout
                mainPipe={mainViewPipe}
                popupPipe={popupPipe}
                translationsPipe={translationsPipe}
            />
        );
    }

    private renderLogin(credentialsJoinPoint: CredentialsJoinPoint): ReactElement {
        return (
            <CredentialsContainer
                authenticationJoinPoint={credentialsJoinPoint}
            />
        );
    }

    private renderLoginBackground(): ReactElement {
        return (
            <ExpandedImageElement
                hints={{className: 'app-background'}}
                backgroundImg={this.state.backgroundImg}
            />
        );
    }

    private renderApp(appCredentials: AppCredentials): ReactElement {
        return <AppView/>;
    }
}
