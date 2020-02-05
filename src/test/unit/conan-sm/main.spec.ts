import {expect} from "chai";
import {SerializedSmEvents} from "../../utils/serializedSmEvents";
import {defaultTranslations, Translations} from "../../../main/domain/translations";
import {Authenticators} from "../../utils/authenticators";
import {MainSm} from "../../../main/sm/main/main.sm";
import {
    AuthenticationPrototype,
    AuthenticationSmJoiner,
    AuthenticationSmListener
} from "../../../main/sm/authentication/authentication.sm";

describe('test', () => {
    const TRANSLATIONS: Translations = defaultTranslations;

    let initializationFork = SerializedSmEvents.fork({
        eventName: 'onDoStart',
        stageName: 'start',
    }, {
        stageName: 'initializing',
    }, SerializedSmEvents.stageAction(
        'initializing',
        'doTranslationsFetched',
        TRANSLATIONS,
        'showingLogin'
    ));


    it("should start automatically initializing a state machine", (done) => {
        new MainSm((actions) => actions.doInitialise(TRANSLATIONS)).define()
            .always('testMainListener', sm => ({
                onShowingLogin: {then: () => sm.stop()},
            }))
            .onStop((events) => {
                expect(events).to.deep.eq(SerializedSmEvents.events(initializationFork));
                done();
            })
            .start('main-test1')
    });

    it("should join with an authentication sm", (done) => {
        new MainSm((actions) => actions.doInitialise(TRANSLATIONS)).define()
            .always('testMainListener', sm => ({
                onShowingApp: {then: () => sm.stop()},
            }))
            .onStop((events) => {
                expect(events).to.deep.eq(SerializedSmEvents.events(initializationFork));
                done();
            })
            .sync <AuthenticationSmListener, AuthenticationSmJoiner>(
                'sync-authentication',
                new AuthenticationPrototype(Authenticators.alwaysAuthenticatesSuccessfullyWith({})).newBuilder(),
                {
                    onAuthenticated: {
                        ifShowingLogin: {
                            thenRequest: (mainActions) => mainActions.doShowApp()
                        }
                    }
                }, (authenticationSm) => authenticationSm.onceAsap('notAuthenticated=>authenticated',{
                    onNotAuthenticated: {
                        thenRequest: (actions) => actions.doAuthenticating({})
                    }
                }))
            .start('main-test2')
    })

});
