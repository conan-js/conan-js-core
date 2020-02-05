import {expect} from "chai";
import {Authenticators} from "../../utils/authenticators";
import {SerializedSmEvents} from "../../utils/serializedSmEvents";
import {AppCredentials, UserNameAndPassword} from "../../../main/domain/domain";
import {TriggerType} from "../../../lib/conan-sm/domain";
import {AuthenticationPrototype} from "../../../main/sm/authentication/authentication.sm";

describe('test', () => {
    const APP_CREDENTIALS: AppCredentials = {test: '1'};
    const USERNAME_AND_PASSWORD: UserNameAndPassword = ['user', 'pwd'];

    let authenticationFork = SerializedSmEvents.fork({
        eventName: 'onDoAuthenticating',
        stageName: 'notAuthenticated',
    }, {
        stageName: 'authenticating',
        payload: USERNAME_AND_PASSWORD
    }, SerializedSmEvents.stageAction(
        'authenticating',
        'doSuccess',
        APP_CREDENTIALS,
        'authenticated',
        APP_CREDENTIALS
    ));

    it("should listen to stages and stop gracefully", (done) => {
        new AuthenticationPrototype(Authenticators.alwaysAuthenticatesSuccessfullyWith(APP_CREDENTIALS)).newBuilder()
            .always('notAuth=>Authenticating', sm => ({
                onNotAuthenticated: {
                    thenRequest: (actions) => actions.doAuthenticating(USERNAME_AND_PASSWORD)
                },
                onAuthenticated: {
                    then: () => sm.stop()
                },
            }))
            .onStop((events) => {
                expect(events).to.deep.eq(SerializedSmEvents.events(authenticationFork, 'notAuthenticated'));
                done();
            }).start('auth-test1')
    });

    it("should listen to stages and actions and stop gracefully", (done) => {
        new AuthenticationPrototype(Authenticators.alwaysAuthenticatesSuccessfullyWith(APP_CREDENTIALS)).newBuilder()
            .always('testMainListener', sm => ({
                onNotAuthenticated: {
                    thenRequest: (actions) => actions.doAuthenticating(USERNAME_AND_PASSWORD)
                },
                onAuthenticated: {
                    thenRequest: (actions) => setTimeout(() => actions.doTimeout())
                },
                onDoTimeout: {
                    then: () => sm.stop()
                }
            }))
            .onStop((events) => {
                expect(events).to.deep.eq(SerializedSmEvents.events([
                    ...authenticationFork,
                    {
                        eventName: 'onDoTimeout',
                        trigger: TriggerType.ACTION_FROM,
                        stageName: 'authenticated'
                    }
                ], 'notAuthenticated'));
                done();
            }).start('auth-test2')
    });

    it("should swap paths and act accordingly", (done) => {
        new AuthenticationPrototype(Authenticators.alwaysAuthenticatesSuccessfullyWith(APP_CREDENTIALS)).newBuilder()
            .always('onNotAuthenticated=>authenticating', sm =>
                ({
                    onNotAuthenticated: {
                        thenRequest: (actions) => {
                            actions.doAuthenticating(USERNAME_AND_PASSWORD);
                        }
                    },
                }))
            .whileOnPath('timeoutAfterAuthentication', 'onAuthenticated=>doTimeout', sm => ({
                onAuthenticated: {
                    thenRequest: (actions) => {
                        sm.joinPath('stopAfterAuthentication');
                        setTimeout(() => actions.doTimeout(), 100);
                    }
                },
            }))
            .whileOnPath('stopAfterAuthentication', 'onAuthenticated=>doStop', sm => ({
                onAuthenticated: {
                    thenRequest: (actions) => sm.stop()
                }
            }))
            .onStop((events) => {
                expect(events).to.deep.eq(SerializedSmEvents.events([
                    ...authenticationFork,
                    ...SerializedSmEvents.stageAction(
                        'authenticated',
                        'doTimeout',
                        null,
                        'notAuthenticated',
                        null
                    ),
                    ...authenticationFork,
                ], 'notAuthenticated'));
                done();
            })
            .start('auth-test3', 'timeoutAfterAuthentication')
    });

    it("should queue a request", (done) => {
        new AuthenticationPrototype(Authenticators.alwaysAuthenticatesSuccessfullyWith(APP_CREDENTIALS)).newBuilder()
            .onceAsap('onNotAuthenticated=>doAuthenticating', {
                onNotAuthenticated: {
                    thenRequest: (actions) => actions.doAuthenticating(USERNAME_AND_PASSWORD)
                }
            })
            .always('testMainListener', sm => ({
                onAuthenticated: {
                    then: () => sm.stop()
                }
            }))
            .onStop((events) => {
                expect(events).to.deep.eq(SerializedSmEvents.events([
                    ...authenticationFork,
                ], 'notAuthenticated'))
                done();
            })
            .start('auth-test4')
    });

    it("should call many times into a listener", (done) => {
        let calls: string [] = [];
        new AuthenticationPrototype(Authenticators.alwaysAuthenticatesSuccessfullyWith(APP_CREDENTIALS)).newBuilder()
            .always('testMainListener', sm => ({
                onNotAuthenticated: {
                    thenRequest: (actions) => {
                        actions.doAuthenticating(USERNAME_AND_PASSWORD);
                        calls.push('first not authenticated');
                    }
                },
                onAuthenticated: {
                    then: () => {
                        calls.push('authenticated');
                        sm.stop();
                    }
                }
            }))
            .always('testMainListener - dupe', {
                onNotAuthenticated: {then: () => calls.push('second not authenticated')},
            })
            .onStop((events) => {
                expect(calls).to.deep.eq([
                    'first not authenticated',
                    'second not authenticated',
                    'authenticated',
                ]);
                done();
            })
            .start('auth-test5');
    });
});
