import {ActionListener, StageEntryPoint, EventListener, SmListener} from "../../../../lib/conan-sm/domain";
import {ShowingLoginStage} from "./showingLoginStage";
import {Translations} from "../../../domain/translations";
import {Stage} from "../../../../lib/conan-sm/stage";

export type InitializingStageName = 'initializing';

export interface InitializingEntryPoint extends StageEntryPoint<InitializingStage>{
    name: InitializingStageName;
}

//Actions associated with this stage
export interface InitializingActions {
    doInitialise (translations: Translations): ShowingLoginStage
}

//Events associated with the actions associated with this stage
export interface InitializingActionsListener extends SmListener{
    onDoInitialise?: ActionListener<InitializingActions, InitializingStage, Translations>
}

//Stage events
export interface InitializingListener extends InitializingActionsListener{
    onInitializing?: EventListener<InitializingActions, InitializingStage>;
}

//Stage
export interface InitializingStage extends Stage <InitializingStageName, InitializingActions> {}
