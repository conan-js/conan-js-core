import {StateMachineController} from "../../../lib/conan-sm/stateMachineController";
import {
    InitializingActions,
    InitializingListener,
    InitializingStage,
    InitializingStageName
} from "./stages/initializing.stage";
import {Translations} from "../../domain/translations";
import {
    ShowingLoginActions,
    ShowingLoginJoiner,
    ShowingLoginListener,
    ShowingLoginStage,
    ShowingLoginStageName
} from "./stages/showingLoginStage";
import {IConsumer} from "../../../lib/conan-utils/typesHelper";
import {ShowingAppJoiner, ShowingAppListener, ShowingAppStage} from "./stages/showingApp.stage";


export type Initializer = IConsumer<InitializingActions>;

export interface MainSmActions extends InitializingActions {
}

export interface MainSmListener extends InitializingListener, ShowingLoginListener, ShowingAppListener {
}

export interface MainSmJoiner extends ShowingAppJoiner, ShowingLoginJoiner {
}

class InitializingActionsLogic implements InitializingActions {
    doInitialise(translations: Translations): ShowingLoginStage {
        return {
            stage: 'showingLogin'
        };
    }
}

class ShowingLoginActionsLogic implements ShowingLoginActions {
    doShowApp(): ShowingAppStage {
        return {
            stage: 'showingApp'
        };
    }

}

export class MainSm {
    constructor(
        private readonly initializer: Initializer
    ) {
    }

    define(): StateMachineController<MainSmListener, MainSmJoiner, MainSmActions> {
        return new StateMachineController([`onStart=>initializing`, {
            onStart: (_, params) => params.sm.requestTransition({
                transition: {
                    stage: 'initializing'
                },
                actionName: 'defaultInitializing'
            })
        }])
            .withDeferredStage<InitializingStageName,
                InitializingActions,
                InitializingStage>('initializing', InitializingActionsLogic, this.initializer, ['showingLogin'])
            .withStage<ShowingLoginStageName,
                ShowingLoginActions,
                ShowingLoginStage>('showingLogin', ShowingLoginActionsLogic)
    }
}
