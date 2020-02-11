import {AuthenticatedStage} from "./authenticated.stage";
import {NotAuthenticatedStage} from "./notAuthenticated.stage";
import {AppCredentials, UserNameAndPassword} from "../../../domain/domain";
import {Stage} from "../../../../lib/conan-sm/stage";
import {SmEventCallback, SmListener} from "../../../../lib/conan-sm/stateMachineListeners";

export type AuthenticatingStageName = 'authenticating';

export interface AuthenticatingActions {
    doSuccess (appCredentials: AppCredentials): AuthenticatedStage;
    doUnauthorised (): NotAuthenticatedStage;
}

export interface AuthenticatingActionsListener extends SmListener{
    onDoSuccess ?: SmEventCallback <AuthenticatingActions>;
    onDoUnauthorised ?: SmEventCallback <AuthenticatingActions>;
}

export interface AuthenticatingListener extends AuthenticatingActionsListener{
    onAuthenticating?: SmEventCallback <AuthenticatingActions>;
}

export interface AuthenticatingStage extends Stage <AuthenticatingStageName, AuthenticatingActions, UserNameAndPassword> {}
