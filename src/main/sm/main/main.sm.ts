import {StateMachineBuilder} from "../../../lib/conan-sm/stateMachineBuilder";
import {
    InitializingActions,
    InitializingListener,
    InitializingStage,
    InitializingStageName
} from "./stages/initializing.stage";
import {Translations} from "../../domain/translations";
import {ShowingLoginJoiner, ShowingLoginListener, ShowingLoginStage} from "./stages/showingLoginStage";
import {IConsumer} from "../../../lib/conan-utils/typesHelper";
import {ShowingAppJoiner, ShowingAppListener} from "./stages/showingApp.stage";


export type Initializer = IConsumer<InitializingActions>;

export interface MainSmActions extends InitializingActions {}
export interface MainSmListener extends InitializingListener, ShowingLoginListener, ShowingAppListener {}
export interface MainSmJoiner extends ShowingAppJoiner, ShowingLoginJoiner {}

class InitializingActionsLogic implements InitializingActions {
    doInitialise(translations: Translations): ShowingLoginStage {
        return {
            name: 'showingLogin'
        };
    }
}

export class MainSm {
    constructor(
        private readonly initializer: Initializer
    ) {}

    define (): StateMachineBuilder <MainSmListener, MainSmJoiner, MainSmActions> {
        return new StateMachineBuilder()
            .withDeferredStage<
                InitializingStageName,
                InitializingActions,
                InitializingStage
                >('initializing', InitializingActionsLogic, this.initializer, ['showingLogin'])
            .requestStage({name: 'start'})
            .requestStage({name: 'initializing'})

    }
}
