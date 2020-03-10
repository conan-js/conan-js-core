import {StateMachine} from "../../../lib/conan-sm/stateMachine";
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
            state: 'showingLogin'
        };
    }
}

class ShowingLoginActionsLogic implements ShowingLoginActions {
    doShowApp(): ShowingAppStage {
        return {
            state: 'showingApp'
        };
    }

}

export class MainSm {
    constructor(
        private readonly initializer: Initializer
    ) {
    }

    define(): StateMachine<MainSmListener, MainSmJoiner, MainSmActions> {
        return new StateMachine([`onStart=>initializing`, {
            onStart: (_, params) => params.sm.requestTransition({
                transition: {
                    state: 'initializing'
                },
                actionName: 'defaultInitializing'
            })
        }])
            .withDeferredStage<InitializingStageName,
                InitializingActions,
                InitializingStage>('initializing', InitializingActionsLogic, this.initializer, ['showingLogin'])
            .withState<ShowingLoginStageName,
                ShowingLoginActions,
                ShowingLoginStage>('showingLogin', ShowingLoginActionsLogic)
    }
}
