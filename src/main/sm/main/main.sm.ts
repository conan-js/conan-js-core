// import {IBiFunction, IConsumer, IVarArgConstructor} from "../../../lib/conan-utils/typesHelper";
// import {EventThread} from "../../../lib/conan-sm/eventThread";
// import {StateMachineBuilder} from "../../../lib/conan-sm/stateMachineBuilder";
// import {SmStartActions, StateMachineBuilderFactory} from "../../../lib/conan-sm/domain";
// import {
//     InitializingActions,
//     InitializingEntryPoint,
//     InitializingListener,
//     InitializingStage
// } from "./stages/initializing.stage";
// import {
//     ShowingLoginEntryPoint,
//     ShowingLoginJoiner,
//     ShowingLoginListener,
//     ShowingLoginStage
// } from "./stages/showingLoginStage";
// import {ShowingAppJoiner, ShowingAppListener} from "./stages/showingApp.stage";
// import {Translations} from "../../domain/translations";
// import {AuthenticatingStage} from "../authentication/stages/authenticating.stage";
//
// export interface MainSmActions extends SmStartActions<InitializingStage> {
// }
//
//
// export interface MainEntryPoints {
//     readonly initializing: InitializingEntryPoint,
//     readonly showingLogin: ShowingLoginEntryPoint,
// }
//
// export type $MainSmActions = IBiFunction<EventThread, MainEntryPoints, IVarArgConstructor<MainSmActions>>;
//
//
// export interface MainSmListener extends InitializingListener, ShowingLoginListener, ShowingAppListener {
// }
//
// export interface MainSmJoiner extends ShowingAppJoiner, ShowingLoginJoiner {
// }
//
//
// export interface MainSm extends StateMachineBuilder <MainSmListener, MainSmJoiner, MainSmActions, InitializingActions> {
// }
//
// export type Initializer = IConsumer<InitializingActions>;
//
// export class MainSmFactory implements StateMachineBuilderFactory <
//     MainSmListener,
//     MainSmJoiner,
//     Initializer,
//     MainEntryPoints,
//     AuthenticatingStage,
//     MainSmActions,
//     MainSm,
//     InitializingActions
// > {
//     create(initializer: Initializer): MainSm {
//         let _mainStages: MainEntryPoints = {
//             initializing: {
//                 name: 'initializing',
//                 create: () => ({
//                     name: 'initializing'
//                 })
//             },
//             showingLogin: {
//                 name: 'showingLogin',
//                 create: () => ({
//                     name: 'showingLogin'
//                 })
//             }
//         };
//
//         let _$MainSmActions: $MainSmActions = (eventThread: EventThread, authenticationStages: MainEntryPoints) => {
//             class MainActionsImpl implements MainSmActions {
//                 constructor(
//                     private readonly initializer: Initializer
//                 ) {
//                 }
//
//                 doStart(): InitializingStage {
//                     return eventThread.forkAction <void, InitializingActions, InitializingStage>(
//                         'doStart',
//                         authenticationStages.initializing.create(),
//                         this.initializer,
//                         (fork) => ({
//                             doInitialise: (translations: Translations): ShowingLoginStage => {
//                                 return fork.closeWithAction(
//                                     'doTranslationsFetched',
//                                     authenticationStages.showingLogin.create(),
//                                     translations
//                                 );
//                             }
//                         })
//                     );
//                 }
//             }
//
//             return MainActionsImpl;
//         };
//
//         return new StateMachineBuilder<MainSmListener, MainSmJoiner, MainSmActions, InitializingActions>(
//             (eventThread) => {
//                 return new (_$MainSmActions(eventThread, _mainStages))(initializer);
//             },
//             undefined,
//             initializer
//         );
//     }
//
// }
