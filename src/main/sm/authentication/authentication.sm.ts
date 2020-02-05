import {StateMachineBuilder} from "../../../lib/conan-sm/stateMachineBuilder";
import {TriggerType} from "../../../lib/conan-sm/domain";
import {EventType} from "../../../lib/conan-sm/stateMachineLogger";
import {
    AuthenticatingActions,
    AuthenticatingActionsListener,
    AuthenticatingStage,
    AuthenticatingStageName
} from "./stages/authenticating.stage";
import {
    NotAuthenticatedActions, NotAuthenticatedListener,
    NotAuthenticatedStage,
    NotAuthenticatedStageName
} from "./stages/notAuthenticated.stage";
import {AppCredentials, UserNameAndPassword} from "../../domain/domain";
import {
    AuthenticatedActions, AuthenticatedJoiner,
    AuthenticatedListener,
    AuthenticatedStage,
    AuthenticatedStageName
} from "./stages/authenticated.stage";
import {IBiConsumer} from "../../../lib/conan-utils/typesHelper";


export class AuthenticatedActionsLogic implements AuthenticatedActions {
    doLogout(): NotAuthenticatedStage {
        return {
            name: "notAuthenticated",
        };
    }

    doTimeout(): NotAuthenticatedStage {
        return {
            name: "notAuthenticated",
        };
    }

}

export class AuthenticatingActionsLogic implements AuthenticatingActions {
    doSuccess(appCredentials: AppCredentials): AuthenticatedStage {
        return {
            requirements: appCredentials,
            name: 'authenticated'
        };
    }

    doUnauthorised(): NotAuthenticatedStage {
        return {
            name: 'notAuthenticated'
        };
    }

}
export class NotAuthenticatedActionsLogic implements NotAuthenticatedActions {
    doAuthenticating(userNameAndPassword: UserNameAndPassword): AuthenticatingStage {
        return {
            name: 'authenticating',
            requirements: userNameAndPassword
        };
    }
}

export type Authenticator = IBiConsumer<AuthenticatingActions, UserNameAndPassword>;
export interface AuthenticationSmActions extends NotAuthenticatedActions, AuthenticatedActions {}
export interface AuthenticationSmListener extends NotAuthenticatedListener, AuthenticatingActionsListener, AuthenticatedListener {}
export interface AuthenticationSmJoiner extends AuthenticatedJoiner {}

export class AuthenticationPrototype {
    constructor(
        private readonly authenticator: Authenticator,
    ) {}

    newBuilder (): StateMachineBuilder <AuthenticationSmListener, AuthenticationSmJoiner, AuthenticationSmActions> {
        return new StateMachineBuilder<AuthenticationSmListener, AuthenticationSmJoiner, AuthenticationSmActions>()
            .withStage<
                NotAuthenticatedStageName,
                NotAuthenticatedActions,
                NotAuthenticatedStage
            > (
                'notAuthenticated',
                NotAuthenticatedActionsLogic,
            )
            .withDeferredStage<
                AuthenticatingStageName,
                AuthenticatingActions,
                AuthenticatingStage,
                UserNameAndPassword
            >(
                "authenticating",
                AuthenticatingActionsLogic,
                this.authenticator,
                ['authenticated']
            ).
            withStage<
                AuthenticatedStageName,
                AuthenticatedActions,
                AuthenticatedStage,
                AppCredentials
            >(
                "authenticated",
                AuthenticatedActionsLogic,
            )
            .requestStage({name: 'start'})
            .requestStage({name: 'notAuthenticated'})
    }
}
