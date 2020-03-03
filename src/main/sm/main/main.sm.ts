import {StateMachineTreeBuilder} from "../../../lib/conan-sm/stateMachineTreeBuilder";
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
            name: 'showingLogin'
        };
    }
}

class ShowingLoginActionsLogic implements ShowingLoginActions {
    doShowApp(): ShowingAppStage {
        return {
            name: 'showingApp'
        };
    }

}

export class MainSm {
    constructor(
        private readonly initializer: Initializer
    ) {
    }

    define(): StateMachineTreeBuilder<MainSmListener, MainSmJoiner, MainSmActions> {
        return new StateMachineTreeBuilder([`onStart=>initializing`, {
            onStart: (_, params) => params.sm.requestTransition({
                into: {
                    name: 'initializing'
                },
                path: 'defaultInitializing'
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
