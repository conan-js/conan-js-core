import {AuthenticatedStage} from "./authenticated.stage";
import {NotAuthenticatedStage} from "./notAuthenticated.stage";
import {AppCredentials, UserNameAndPassword} from "../../../domain/domain";
import {Stage} from "../../../../lib/conan-sm/stage";
import {OnEventCallback, SmListener} from "../../../../lib/conan-sm/stateMachineListeners";

export type AuthenticatingStageName = 'authenticating';

export interface AuthenticatingActions {
    doSuccess (appCredentials: AppCredentials): AuthenticatedStage;
    doUnauthorised (): NotAuthenticatedStage;
}

export interface AuthenticatingActionsListener extends SmListener{
    onDoSuccess ?: OnEventCallback <AuthenticatingActions>;
    onDoUnauthorised ?: OnEventCallback <AuthenticatingActions>;
}

export interface AuthenticatingListener extends SmListener{
    onAuthenticating?: OnEventCallback <AuthenticatingActions>;
}

export interface AuthenticatingStage extends Stage <AuthenticatingStageName, UserNameAndPassword> {}
