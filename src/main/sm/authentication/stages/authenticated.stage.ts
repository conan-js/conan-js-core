import {NotAuthenticatedStage} from "./notAuthenticated.stage";
import {AppCredentials} from "../../../domain/domain";
import {Stage} from "../../../../lib/conan-sm/stage";
import {OnEventCallback, SmListener} from "../../../../lib/conan-sm/stateMachineListeners";


export type AuthenticatedStageName = 'authenticated';

export interface AuthenticatedActions {
    doTimeout(): NotAuthenticatedStage;
    doLogout(): NotAuthenticatedStage;
}

export interface AuthenticatedActionListener extends SmListener{
    onDoTimeout?: OnEventCallback <AuthenticatedActions>
    onDoLogout?: OnEventCallback <AuthenticatedActions>
}

export interface AuthenticatedListener extends SmListener {
    onAuthenticated?: OnEventCallback <AuthenticatedActions>
}

export interface AuthenticatedJoiner extends SmListener {
    ifAuthenticated?: OnEventCallback <AuthenticatedActions>
}

export interface AuthenticatedStage extends Stage <AuthenticatedStageName, AppCredentials>{}
