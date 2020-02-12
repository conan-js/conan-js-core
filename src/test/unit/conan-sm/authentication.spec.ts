import {expect} from "chai";
import {Authenticators} from "../../utils/authenticators";
import {SerializedSmEvents} from "../../utils/serializedSmEvents";
import {AppCredentials, UserNameAndPassword} from "../../../main/domain/domain";
import {AuthenticationPrototype} from "../../../main/sm/authentication/authentication.sm";

describe('test', () => {
    const APP_CREDENTIALS: AppCredentials = {test: '1'};
    const USERNAME_AND_PASSWORD: UserNameAndPassword = ['user', 'pwd'];

    let authenticationFork = SerializedSmEvents.fork({
        eventName: 'onDoAuthenticating',
        stageName: 'notAuthenticated',
        payload: USERNAME_AND_PASSWORD,
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
            .always(['notAuth=>Authenticating, authenticated=>stop', {
                onNotAuthenticated: (actions) => actions.doAuthenticating(USERNAME_AND_PASSWORD),
                onAuthenticated: (actions, params) => params.sm.stop(),
            }])
            .once(['stop=>test', {
                onStop: (actions, params) => {
                    expect(params.sm.getEvents()).to.deep.eq(SerializedSmEvents.events(authenticationFork, 'notAuthenticated'));
                    done();
                }

            }])
            .start('auth-test1')
    });

    it("should listen to stages and actions and stop gracefully", (done) => {
        new AuthenticationPrototype(Authenticators.alwaysAuthenticatesSuccessfullyWith(APP_CREDENTIALS)).newBuilder()
            .always(['notAuthenticated=>authenticating, authenticated=>doTimeout, doTimeout=>stop', {
                onNotAuthenticated: (actions) => actions.doAuthenticating(USERNAME_AND_PASSWORD),
                onAuthenticated: (actions, params) => setTimeout(() => actions.doTimeout()),
                onDoTimeout: (actions, params)=> params.sm.stop()
            }])
            .always(['stop => test', {
                onStop: (_, params) => {
                    {
                        expect(params.sm.getEvents()).to.deep.eq(SerializedSmEvents.events([
                            ...authenticationFork,
                            {
                                eventName: 'onDoTimeout',
                                stageName: 'authenticated'
                            }
                        ], 'notAuthenticated'));
                        done();
                    }

                },
            }])
            .start('auth-test2')
    });


    it("should queue a request", (done) => {
        new AuthenticationPrototype(Authenticators.alwaysAuthenticatesSuccessfullyWith(APP_CREDENTIALS)).newBuilder()
            .once(['onNotAuthenticated=>doAuthenticating', {
                onNotAuthenticated: (actions) => actions.doAuthenticating(USERNAME_AND_PASSWORD)
            }])
            .always(['testMainListener', {
                onAuthenticated: (actions, params) => params.sm.stop()
            }])
            .always(['stop=>test', {
                onStop: (_, params) => {
                        expect(params.sm.getEvents()).to.deep.eq(SerializedSmEvents.events([
                            ...authenticationFork,
                        ], 'notAuthenticated'));
                        done();
                    }

            }])
            .start('auth-test4')
    });

    it("should call many times into a listener", (done) => {
        let calls: string [] = [];
        new AuthenticationPrototype(Authenticators.alwaysAuthenticatesSuccessfullyWith(APP_CREDENTIALS)).newBuilder()
            .always(['testMainListener', {
                onNotAuthenticated: (actions) => {
                        actions.doAuthenticating(USERNAME_AND_PASSWORD);
                        calls.push('first not authenticated');
                },
                onAuthenticated: (_, params) => {
                        calls.push('authenticated');
                        params.sm.stop();
                }
            }])
            .always(['testMainListener - dupe', {
                onNotAuthenticated: () => calls.push('second not authenticated'),
            }])
            .always(['stop=>test', {
                onStop: () => {
                        expect(calls).to.deep.eq([
                            'first not authenticated',
                            'second not authenticated',
                            'authenticated',
                        ]);
                        done();
                    }
            }])
            .start('auth-test5');
    });
});
