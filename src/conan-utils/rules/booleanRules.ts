import {BaseRules} from "./baseRules";
import {Rule} from "./_rules";

export class BooleanRules {
    static ifTrue(): Rule {
        return BaseRules.compareByReference('ifTrue', true);
    }

    static ifFalse(): Rule {
        return BaseRules.compareByReference('ifTrue', false);
    }

}

