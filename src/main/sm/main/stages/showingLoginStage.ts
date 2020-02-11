import {SmEventCallback, SmListener, StageEntryPoint} from "../../../../lib/conan-sm/domain";
import {ShowingAppStage} from "./showingApp.stage";
import {Stage} from "../../../../lib/conan-sm/stage";

export type ShowingLoginStageName = 'showingLogin';


export interface ShowingLoginActions {
    doShowApp (): ShowingAppStage
}

export interface ShowingLoginActionsListener extends SmListener{
    onDoShowApp?: SmEventCallback<ShowingLoginActions>
}

export interface ShowingLoginListener extends ShowingLoginActionsListener{
    onShowingLogin?: SmEventCallback<ShowingLoginActions>;
}

export interface ShowingLoginJoiner extends SmListener{
    ifShowingLogin?: SmEventCallback<ShowingLoginActions>;

}

export interface ShowingLoginStage extends Stage<ShowingLoginStageName, ShowingLoginActions>{}

