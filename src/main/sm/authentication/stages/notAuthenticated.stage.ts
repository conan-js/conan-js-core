import {UserNameAndPassword} from "../../../domain/domain";
import {AuthenticatingStage} from "./authenticating.stage";
import {ActionListener, StageEntryPoint, EventListener, SmListener} from "../../../../lib/conan-sm/domain";
import {Stage} from "../../../../lib/conan-sm/stage";

export type NotAuthenticatedStageName = 'notAuthenticated';

export interface NotAuthenticatedEntryPoint extends StageEntryPoint<NotAuthenticatedStage>{
    name: NotAuthenticatedStageName;
}

//Actions associated with this stage
export interface NotAuthenticatedActions {
    doAuthenticating (userNameAndPassword: UserNameAndPassword): AuthenticatingStage
}

//Events associated with the actions associated with this stage
export interface NotAuthenticatedActionsListener extends SmListener{
    onDoAuthenticating?: ActionListener<NotAuthenticatedActions, NotAuthenticatedStage, UserNameAndPassword>
}

//Stage events
export interface NotAuthenticatedListener extends NotAuthenticatedActionsListener{
    onNotAuthenticated?: EventListener<NotAuthenticatedActions, NotAuthenticatedStage>;
}

//Stage
export interface NotAuthenticatedStage extends Stage<NotAuthenticatedStageName, NotAuthenticatedActions>{}
