import {ShowingLoginStage} from "./showingLoginStage";
import {Translations} from "../../../domain/translations";
import {Stage} from "../../../../lib/conan-sm/stage";
import {OnEventCallback, SmListener} from "../../../../lib/conan-sm/stateMachineListeners";

export type InitializingStageName = 'initializing';

export interface InitializingActions {
    doInitialise (translations: Translations): ShowingLoginStage
}

export interface InitializingActionsListener extends SmListener{
    onDoInitialise?: OnEventCallback<InitializingActions>
}

export interface InitializingListener extends InitializingActionsListener{
    onInitializing?: OnEventCallback<InitializingActions>;
}

export interface InitializingStage extends Stage <InitializingStageName, InitializingActions> {}
