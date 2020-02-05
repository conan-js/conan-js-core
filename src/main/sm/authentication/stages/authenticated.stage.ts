import {NotAuthenticatedStage} from "./notAuthenticated.stage";
import {AppCredentials} from "../../../domain/domain";
import {ActionListener, StageEntryPoint, EventListener, SmListener} from "../../../../lib/conan-sm/domain";
import {Stage} from "../../../../lib/conan-sm/stage";


export type AuthenticatedStageName = 'authenticated';

export interface AuthenticatedEntryPoint extends StageEntryPoint<AuthenticatedStage, AppCredentials>{
    name: AuthenticatedStageName;
}

export interface AuthenticatedActions {
    doTimeout(): NotAuthenticatedStage;
    doLogout(): NotAuthenticatedStage;
}

export interface AuthenticatedActionListener extends SmListener{
    onDoTimeout?: ActionListener<AuthenticatedActions, AuthenticatedStage>
    onDoLogout?: ActionListener<AuthenticatedActions, AuthenticatedStage>
}

export interface AuthenticatedListener extends AuthenticatedActionListener {
    onAuthenticated?: EventListener<AuthenticatedActions, AuthenticatedStage, AppCredentials>
}

export interface AuthenticatedJoiner extends SmListener {
    ifAuthenticated?: EventListener<AuthenticatedActions, AuthenticatedStage, AppCredentials>
}

export interface AuthenticatedStage extends Stage <AuthenticatedStageName, AuthenticatedActions, AppCredentials>{}
