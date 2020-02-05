import {AuthenticatedStage} from "./authenticated.stage";
import {NotAuthenticatedStage} from "./notAuthenticated.stage";
import {AppCredentials, UserNameAndPassword} from "../../../domain/domain";
import {ActionListener, StageEntryPoint, EventListener, SmListener} from "../../../../lib/conan-sm/domain";
import {Stage} from "../../../../lib/conan-sm/stage";

export type AuthenticatingStageName = 'authenticating';

export interface AuthenticatingEntryPoint extends StageEntryPoint<AuthenticatingStage, UserNameAndPassword>{
    name: AuthenticatingStageName;
}

export interface AuthenticatingActions {
    doSuccess (appCredentials: AppCredentials): AuthenticatedStage;
    doUnauthorised (): NotAuthenticatedStage;
}

export interface AuthenticatingActionsListener extends SmListener{
    onDoSuccess ?: ActionListener<AuthenticatingActions, AuthenticatingStage, AppCredentials>;
    onDoUnauthorised ?: ActionListener<AuthenticatingActions, AuthenticatingStage>;
}

export interface AuthenticatingListener extends AuthenticatingActionsListener{
    onAuthenticating?: EventListener<AuthenticatingActions, AuthenticatingStage, UserNameAndPassword>;
}

export interface AuthenticatingStage extends Stage <AuthenticatingStageName, AuthenticatingActions, UserNameAndPassword> {}
