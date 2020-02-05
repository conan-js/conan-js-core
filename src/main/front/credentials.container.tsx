import * as React from "react";
import {Component, ReactElement} from "react";
import {StateMachineFactory} from "../../lib/stateMachine/stateMachineFactory";
import {CredentialsOrchestrator, CredentialsJoinPoint, CredentialsSm} from "../sm/credentials.sm";
import {BindPipe, Pipe, Pipes} from "../../lib/pipes/pipes";
import {LoginWrapper} from "./login.wrapper";
import {DiHydrator} from "../../lib/conan-di/core/diHydrater";
import {Translations} from "../domain/translations";

interface CredentialsContainerProps {
    authenticationJoinPoint: CredentialsJoinPoint
}

interface CredentialsContainerState {
    translations: Translations
}

export class CredentialsContainer extends Component<CredentialsContainerProps, CredentialsContainerState> {
    constructor(props:CredentialsContainerProps) {
        super(props);
        this.state = DiHydrator.hydrate<CredentialsContainerState>({
            translations: 'translations'
        })
    }

    render(): ReactElement {
        let credentialsSm: CredentialsSm = StateMachineFactory.create<CredentialsJoinPoint, CredentialsOrchestrator>(
            CredentialsSm,
            (credentialsEp) => credentialsEp.joinEnteringCredentials()
        );

        let credentialsViewPipe: Pipe<ReactElement> = Pipes.createPipe('credentialsView');

        credentialsSm.joinPaths(this.props.authenticationJoinPoint);
        credentialsSm.joinPaths({
            enteringCredentials: () => credentialsViewPipe.push(this.renderLogin())
        });

        return <BindPipe
            pipe={credentialsViewPipe}
        />;
    }

    private renderLogin(): ReactElement {
        return <LoginWrapper _s={this.state.translations}/>;
    }
}
