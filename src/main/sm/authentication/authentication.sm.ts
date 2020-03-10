import {StateMachine} from "../../../lib/conan-sm/stateMachine";
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
            state: "notAuthenticated",
        };
    }

    doTimeout(): NotAuthenticatedStage {
        return {
            state: "notAuthenticated",
        };
    }

}

export class AuthenticatingActionsLogic implements AuthenticatingActions {
    doSuccess(appCredentials: AppCredentials): AuthenticatedStage {
        return {
            data: appCredentials,
            state: 'authenticated'
        };
    }

    doUnauthorised(): NotAuthenticatedStage {
        return {
            state: 'notAuthenticated'
        };
    }

}

export class NotAuthenticatedActionsLogic implements NotAuthenticatedActions {
    doAuthenticating(userNameAndPassword: UserNameAndPassword): AuthenticatingStage {
        return {
            state: 'authenticating',
            data: userNameAndPassword
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

    newBuilder(): StateMachine<AuthenticationSmListener, AuthenticationSmJoiner, AuthenticationSmActions> {
        return new StateMachine([`::start=>doNotAuth`, {
            onStart: (_, params) => params.sm.requestTransition({
                transition: {
                    state: 'notAuthenticated'
                },
                actionName: 'doNotAuthenticated'
            })
        }])
            .withState<NotAuthenticatedStageName,
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
            ).withState<AuthenticatedStageName,
                AuthenticatedActions,
                AppCredentials>(
                "authenticated",
                AuthenticatedActionsLogic,
            )
    }
}
