import {Flows} from "../../../../../src/core/conan-flow/factories/flows";
import {expect} from "chai";


export type Token = string;

describe(`authentication`, function () {

    class DummyAuthenticator {
        public static authenticate(password: string): boolean {
            return password == "lolito";
        }
    }

    interface AuthenticationFlow {
        notAuthenticated: void;
        authenticating: [string, string];
        authenticated: Token;
        authenticationFailed: void;
    }

    let authenticationFlow = Flows.create<AuthenticationFlow>({
        name: 'authentication',
        statuses: {
            notAuthenticated: {},
            authenticated: {},
            authenticating: {
                reactions: [
                    onAuthenticating => {
                        let valid = DummyAuthenticator.authenticate(onAuthenticating.getData()[1]);
                        const nextStatus = valid ? {
                            name: "authenticated" as any,
                            data: "TOKEN"
                        } : {name: "authenticationFailed"};
                        setTimeout(() => onAuthenticating.do.$toStatus(nextStatus), 100);
                    }
                ],
            },
            authenticationFailed: {
                reactions: [
                    onAuthenticationFailed => onAuthenticationFailed.do.$toStatus("notAuthenticated")
                ],
            }
        },
        initialStatus: {
            name: 'notAuthenticated',
        }
    });

    it(`should authenticate`, (done) => {

        authenticationFlow.onceOn("notAuthenticated", onNotAuthenticated => {
            setTimeout(() => onNotAuthenticated.do.$toStatus(
                {
                    name: "authenticating", data: ["pepito", "lolito"]
                }), 100
            )
        });

        authenticationFlow.alwaysOn('authenticated', context => {
                setTimeout(() => context.interruptFlow(), 100);
            }
        );

        authenticationFlow.onceOnStop(() => {
                done();
                expect(
                    authenticationFlow
                        .getEvents()
                        .serializeStatuses({excludeInit: true, excludeStop: true})
                        .map(it => it.status.name + `[${it.status.data}]`)
                ).to.deep.eq([
                    'notAuthenticated[undefined]', 'authenticating[pepito,lolito]', 'authenticated[TOKEN]'
                ]);
            }
        );

        authenticationFlow.start();
    })

    it(`should not authenticate`, (done) => {

        authenticationFlow.onceOn("notAuthenticated", onNotAuthenticated => {
            setTimeout(() => onNotAuthenticated.do.$toStatus(
                {
                    name: "authenticating", data: ["pepito", "lolitorrr"]
                }), 100
            )
        });

        authenticationFlow.alwaysOn('authenticationFailed', context => {
                setTimeout(() => context.interruptFlow(), 100);
            }
        );

        authenticationFlow.onceOnStop(() => {
                done();
                expect(
                    authenticationFlow
                        .getEvents()
                        .serializeStatuses({excludeInit: true, excludeStop: true})
                        .map(it => it.status.name + `[${it.status.data}]`)
                ).to.deep.eq([
                    'notAuthenticated[undefined]', 'authenticating[pepito,lolitorrr]', 'authenticationFailed[undefined]', 'notAuthenticated[undefined]'
                ]);
            }
        );

        authenticationFlow.start();
    })
})
