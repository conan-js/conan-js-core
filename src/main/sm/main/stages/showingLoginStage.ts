import {ShowingAppStage} from "./showingApp.stage";
import {Stage} from "../../../../lib/conan-sm/stage";
import {OnEventCallback, SmListener} from "../../../../lib/conan-sm/stateMachineListeners";
import {StageEntryPoint} from "../../../../lib/conan-sm/stateMachineEvents";

export type ShowingLoginStageName = 'showingLogin';


export interface ShowingLoginActions {
    doShowApp (): ShowingAppStage
}

export interface ShowingLoginActionsListener extends SmListener{
    onDoShowApp?: OnEventCallback<ShowingLoginActions>
}

export interface ShowingLoginListener extends ShowingLoginActionsListener{
    onShowingLogin?: OnEventCallback<ShowingLoginActions>;
}

export interface ShowingLoginJoiner extends SmListener{
    ifShowingLogin?: OnEventCallback<ShowingLoginActions>;

}

export interface ShowingLoginStage extends Stage<ShowingLoginStageName, ShowingLoginActions>{}

