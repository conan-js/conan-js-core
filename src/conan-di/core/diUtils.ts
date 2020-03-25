import {Strings} from "../../conan-utils/strings";
import {IVarArgConstructor} from "../../conan-utils/typesHelper";

export class DiUtils {
    static beanName (from: IVarArgConstructor<any>): string {
        return Strings.firstCharToLowerCase(from.name);
    }
}
