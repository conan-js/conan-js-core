// import {
//     NotAuthenticatedActions, NotAuthenticatedActionsListener,
//     NotAuthenticatedEntryPoint,
//     NotAuthenticatedListener,
//     NotAuthenticatedStage
// } from "./stages/notAuthenticated.stage";
// import {
//     AuthenticatedActions,
//     AuthenticatedEntryPoint, AuthenticatedJoiner,
//     AuthenticatedListener,
//     AuthenticatedStage
// } from "./stages/authenticated.stage";
// import {
//     AuthenticatingActions,
//     AuthenticatingActionsListener,
//     AuthenticatingEntryPoint,
//     AuthenticatingStage
// } from "./stages/authenticating.stage";
// import {IBiConsumer, IBiFunction, IConsumer, IFunction, IVarArgConstructor} from "../../../lib/conan-utils/typesHelper";
// import {AppCredentials, UserNameAndPassword} from "../../domain/domain";
// import {EventThread} from "../../../lib/conan-sm/eventThread";
// import {StateMachineBuilder} from "../../../lib/conan-sm/stateMachineBuilder";
// import {StateMachineBuilderFactory} from "../../../lib/conan-sm/domain";
//
// export interface AuthenticationSmActions extends NotAuthenticatedActions, AuthenticatedActions {
// }
//
//
// export interface AuthenticationEntryPoints {
//     readonly notAuthenticated: NotAuthenticatedEntryPoint,
//     readonly authenticating: AuthenticatingEntryPoint,
//     readonly authenticated: AuthenticatedEntryPoint,
// }
//
// export type $AuthenticationSmActions = IBiFunction<EventThread, AuthenticationEntryPoints, IVarArgConstructor<AuthenticationSmActions>>;
//
//
//
// export interface AuthenticationSmListener extends NotAuthenticatedListener, AuthenticatingActionsListener, AuthenticatedListener {}
// export interface AuthenticationSmJoiner extends AuthenticatedJoiner {}
//
//
// export type ValidInitialStages = NotAuthenticatedStage | AuthenticatedStage;
//
// export interface AuthenticationSm extends StateMachineBuilder <AuthenticationSmListener, AuthenticationSmJoiner, AuthenticationSmActions> {}
//
// export class AuthenticationSmFactory implements StateMachineBuilderFactory <
//         AuthenticationSmListener,
//         AuthenticationSmJoiner,
//         Authenticator,
//         AuthenticationEntryPoints,
//         ValidInitialStages,
//         AuthenticationSmActions,
//         AuthenticationSm> {
//     create(authenticator: Authenticator, initialStageProvider: (input: AuthenticationEntryPoints) => ValidInitialStages): AuthenticationSm {
//         let _authenticationStages: AuthenticationEntryPoints = {
//             authenticating: {
//                 name: 'authenticating',
//                 create: (userNameAndPassword)=>({
//                     requirements: userNameAndPassword,
//                     name: 'authenticating'
//                 })
//             },
//             notAuthenticated: {
//                 name: 'notAuthenticated',
//                 create: ()=>({
//                     name: 'notAuthenticated'
//                 })
//             },
//             authenticated: {
//                 name: 'authenticated',
//                 create: (appCredentials)=>({
//                     name: 'authenticated',
//                     requirements:appCredentials
//                 })
//             }
//         };
//
//         let _$AuthenticationSmActions: $AuthenticationSmActions = (eventThread: EventThread, authenticationStages: AuthenticationEntryPoints) => {
//             class AuthenticationActionsImpl implements AuthenticationSmActions {
//                 constructor(
//                     private readonly authenticator: Authenticator,
//                 ) {
//                 }
//
//                 doAuthenticating(userNameAndPassword: UserNameAndPassword): AuthenticatingStage {
//                     return eventThread.forkAction<UserNameAndPassword, AuthenticatingActions, AuthenticatingStage>(
//                         'doAuthenticating',
//                         authenticationStages.authenticating.create(userNameAndPassword),
//                         this.authenticator(userNameAndPassword),
//                         (fork) => ({
//                             doSuccess: (appCredentials: AppCredentials) => fork.closeWithAction('doSuccess', authenticationStages.authenticated.create(appCredentials), appCredentials),
//                             doUnauthorised: () => fork.closeWithAction('doUnauthorised', authenticationStages.notAuthenticated.create())
//                         })
//                     );
//                 }
//
//                 doLogout(): NotAuthenticatedStage {
//                     return eventThread.actionToStage('doLogout', authenticationStages.notAuthenticated.create());
//                 }
//
//                 doTimeout(): NotAuthenticatedStage {
//                     return eventThread.actionToStage('doTimeout', authenticationStages.notAuthenticated.create());
//                 }
//             }
//
//             return AuthenticationActionsImpl;
//         };
//
//         return new StateMachineBuilder<AuthenticationSmListener, AuthenticationSmJoiner, AuthenticationSmActions>(
//             (eventThread) => new (_$AuthenticationSmActions(eventThread, _authenticationStages))(authenticator),
//             initialStageProvider(_authenticationStages)
//         );
//     }
//
// }
