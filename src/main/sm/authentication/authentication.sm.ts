import {StateMachineController} from "../../../lib/conan-sm/stateMachineController";
import {
    AuthenticatingActions,
    AuthenticatingListener,
    AuthenticatingStage,
    AuthenticatingStageName
} from "./stages/authenticating.stage";
import {
    NotAuthenticatedActions,
    NotAuthenticatedListener,
    NotAuthenticatedStage,
    NotAuthenticatedStageName
} from "./stages/notAuthenticated.stage";
import {AppCredentials, UserNameAndPassword} from "../../domain/domain";
import {
    AuthenticatedActions,
    AuthenticatedJoiner,
    AuthenticatedListener,
    AuthenticatedStage,
    AuthenticatedStageName
} from "./stages/authenticated.stage";
import {IBiConsumer} from "../../../lib/conan-utils/typesHelper";
import {BasicSmListener, SmListenerDef} from "../../../lib/conan-sm/stateMachineListeners";


export class AuthenticatedActionsLogic implements AuthenticatedActions {
    doLogout(): NotAuthenticatedStage {
        return {
            stage: "notAuthenticated",
        };
    }

    doTimeout(): NotAuthenticatedStage {
        return {
            stage: "notAuthenticated",
        };
    }

}

export class AuthenticatingActionsLogic implements AuthenticatingActions {
    doSuccess(appCredentials: AppCredentials): AuthenticatedStage {
        return {
            state: appCredentials,
            stage: 'authenticated'
        };
    }

    doUnauthorised(): NotAuthenticatedStage {
        return {
            stage: 'notAuthenticated'
        };
    }

}

export class NotAuthenticatedActionsLogic implements NotAuthenticatedActions {
    doAuthenticating(userNameAndPassword: UserNameAndPassword): AuthenticatingStage {
        return {
            stage: 'authenticating',
            state: userNameAndPassword
        };
    }
}

export type Authenticator = IBiConsumer<AuthenticatingActions, UserNameAndPassword>;

export interface AuthenticationSmActions extends NotAuthenticatedActions, AuthenticatedActions {
}

export interface AuthenticationSmListener extends NotAuthenticatedListener, AuthenticatingListener, AuthenticatedListener, BasicSmListener {
}

export interface AuthenticationSmJoiner extends AuthenticatedJoiner {
}

export class AuthenticationPrototype {
    constructor(
        private readonly authenticator: Authenticator,
    ) {
    }

    newBuilder(): StateMachineController<AuthenticationSmListener, AuthenticationSmJoiner, AuthenticationSmActions> {
        return new StateMachineController([`::start=>doNotAuth`, {
            onStart: (_, params) => params.sm.requestTransition({
                into: {
                    stage: 'notAuthenticated'
                },
                path: 'doNotAuthenticated'
            })
        }])
            .withStage<NotAuthenticatedStageName,
                NotAuthenticatedActions>(
                'notAuthenticated',
                NotAuthenticatedActionsLogic,
            )
            .withDeferredStage<AuthenticatingStageName,
                AuthenticatingActions,
                UserNameAndPassword>(
                "authenticating",
                AuthenticatingActionsLogic,
                this.authenticator,
                ['authenticated']
            ).withStage<AuthenticatedStageName,
                AuthenticatedActions,
                AppCredentials>(
                "authenticated",
                AuthenticatedActionsLogic,
            )
    }
}
