import {ActionListener, StageEntryPoint, EventListener, SmListener} from "../../../../lib/conan-sm/domain";
import {ShowingLoginStage} from "./showingLoginStage";
import {Stage} from "../../../../lib/conan-sm/stage";

export type ShowingAppStageName = 'showingApp';

export interface ShowingAppEntryPoint extends StageEntryPoint<ShowingAppStage>{
    name: ShowingAppStageName;
}

//Actions associated with this stage
export interface ShowingAppActions {
    doShowLogin (): ShowingLoginStage;
}

//Events associated with the actions associated with this stage
export interface ShowingAppActionsListener extends SmListener{
    onDoLogout?: ActionListener<ShowingAppActions, ShowingAppStage>
}

//Stage events
export interface ShowingAppListener extends ShowingAppActionsListener{
    onShowingApp?: EventListener<ShowingAppActions, ShowingAppStage>;
}
export interface ShowingAppJoiner extends SmListener{
    ifShowingApp?: EventListener<ShowingAppActions, ShowingAppStage>;
}

//Stage
export interface ShowingAppStage extends Stage{}

