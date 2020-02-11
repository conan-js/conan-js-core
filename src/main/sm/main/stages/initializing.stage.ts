import {ShowingLoginStage} from "./showingLoginStage";
import {Translations} from "../../../domain/translations";
import {Stage} from "../../../../lib/conan-sm/stage";
import {SmEventCallback, SmListener} from "../../../../lib/conan-sm/stateMachineListeners";

export type InitializingStageName = 'initializing';

export interface InitializingActions {
    doInitialise (translations: Translations): ShowingLoginStage
}

export interface InitializingActionsListener extends SmListener{
    onDoInitialise?: SmEventCallback<InitializingActions>
}

export interface InitializingListener extends InitializingActionsListener{
    onInitializing?: SmEventCallback<InitializingActions>;
}

export interface InitializingStage extends Stage <InitializingStageName, InitializingActions> {}
