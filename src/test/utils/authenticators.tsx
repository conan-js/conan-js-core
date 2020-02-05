import {AppCredentials} from "../../main/domain/domain";
import {Authenticator} from "../../main/sm/authentication/authenticationSm.prototype";

export abstract class Authenticators {
    static alwaysAuthenticatesSuccessfullyWith (appCredentials: AppCredentials): Authenticator {
        return (authenticatingActions) =>  {
            return authenticatingActions.doSuccess(appCredentials);
        };
    }
}
