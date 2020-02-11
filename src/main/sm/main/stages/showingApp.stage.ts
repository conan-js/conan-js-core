import {SmEventCallback, SmListener} from "../../../../lib/conan-sm/domain";
import {ShowingLoginStage} from "./showingLoginStage";
import {Stage} from "../../../../lib/conan-sm/stage";

export type ShowingAppStageName = 'showingApp';

export interface ShowingAppActions {
    doShowLogin (): ShowingLoginStage;
}

export interface ShowingAppActionsListener extends SmListener{
    onDoLogout?: SmEventCallback<ShowingAppActions>
}

export interface ShowingAppListener extends ShowingAppActionsListener{
    onShowingApp?: SmEventCallback<ShowingAppActions>;
}

export interface ShowingAppJoiner extends SmListener{
    ifShowingApp?: SmEventCallback<ShowingAppActions>;
}

export interface ShowingAppStage extends Stage<ShowingAppStageName, ShowingAppActions>{}

