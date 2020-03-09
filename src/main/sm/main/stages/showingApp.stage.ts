import {ShowingLoginStage} from "./showingLoginStage";
import {Stage} from "../../../../lib/conan-sm/stage";
import {OnEventCallback, SmListener} from "../../../../lib/conan-sm/stateMachineListeners";

export type ShowingAppStageName = 'showingApp';

export interface ShowingAppActions {
    doShowLogin (): ShowingLoginStage;
}

export interface ShowingAppActionsListener extends SmListener{
    onDoLogout?: OnEventCallback<ShowingAppActions>
}

export interface ShowingAppListener extends ShowingAppActionsListener{
    onShowingApp?: OnEventCallback<ShowingAppActions>;
}

export interface ShowingAppJoiner extends SmListener{
    ifShowingApp?: OnEventCallback<ShowingAppActions>;
}

export interface ShowingAppStage extends Stage<ShowingAppStageName, ShowingAppActions>{}

