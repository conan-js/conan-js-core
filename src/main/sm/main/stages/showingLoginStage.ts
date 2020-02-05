import {ActionListener, StageEntryPoint, EventListener, SmListener} from "../../../../lib/conan-sm/domain";
import {ShowingAppStage} from "./showingApp.stage";
import {Stage} from "../../../../lib/conan-sm/stage";

export type ShowingLoginStageName = 'showingLogin';

export interface ShowingLoginEntryPoint extends StageEntryPoint<ShowingLoginStage>{
    name: ShowingLoginStageName;
}

//Actions associated with this stage
export interface ShowingLoginActions {
    doShowApp (): ShowingAppStage
}

//Events associated with the actions associated with this stage
export interface ShowingLoginActionsListener extends SmListener{
    onDoShowApp?: ActionListener<ShowingLoginActions, ShowingLoginStage>
}

//Stage events
export interface ShowingLoginListener extends ShowingLoginActionsListener{
    onShowingLogin?: EventListener<ShowingLoginActions, ShowingLoginStage>;
}

export interface ShowingLoginJoiner extends SmListener{
    ifShowingLogin?: EventListener<ShowingLoginActions, ShowingLoginStage>;

}

//Stage
export interface ShowingLoginStage extends Stage<ShowingLoginStageName, ShowingLoginActions>{}

