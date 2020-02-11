import {UserNameAndPassword} from "../../../domain/domain";
import {AuthenticatingStage} from "./authenticating.stage";
import {Stage} from "../../../../lib/conan-sm/stage";
import {SmEventCallback, SmListener} from "../../../../lib/conan-sm/stateMachineListeners";

export type NotAuthenticatedStageName = 'notAuthenticated';

export interface NotAuthenticatedActions {
    doAuthenticating (userNameAndPassword: UserNameAndPassword): AuthenticatingStage
}

export interface NotAuthenticatedActionsListener extends SmListener{
    onDoAuthenticating?: SmEventCallback <NotAuthenticatedActions>
}

export interface NotAuthenticatedListener extends NotAuthenticatedActionsListener{
    onNotAuthenticated?: SmEventCallback <NotAuthenticatedActions>;
}

export interface NotAuthenticatedStage extends Stage<NotAuthenticatedStageName, NotAuthenticatedActions>{}
