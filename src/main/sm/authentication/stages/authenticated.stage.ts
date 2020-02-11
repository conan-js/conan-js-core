import {NotAuthenticatedStage} from "./notAuthenticated.stage";
import {AppCredentials} from "../../../domain/domain";
import {SmEventCallback, SmListener} from "../../../../lib/conan-sm/domain";
import {Stage} from "../../../../lib/conan-sm/stage";


export type AuthenticatedStageName = 'authenticated';

export interface AuthenticatedActions {
    doTimeout(): NotAuthenticatedStage;
    doLogout(): NotAuthenticatedStage;
}

export interface AuthenticatedActionListener extends SmListener{
    onDoTimeout?: SmEventCallback <AuthenticatedActions>
    onDoLogout?: SmEventCallback <AuthenticatedActions>
}

export interface AuthenticatedListener extends AuthenticatedActionListener {
    onAuthenticated?: SmEventCallback <AuthenticatedActions>
}

export interface AuthenticatedJoiner extends SmListener {
    ifAuthenticated?: SmEventCallback <AuthenticatedActions>
}

export interface AuthenticatedStage extends Stage <AuthenticatedStageName, AuthenticatedActions, AppCredentials>{}
