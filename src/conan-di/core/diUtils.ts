import {Strings} from "../../conan-utils/strings";
import {IVarArgConstructor} from "../../conan-utils/typesHelper";
import {Injectable} from "./diDomain";

export class DiUtils {
    static beanName (from: Injectable<any>): string {
        return Strings.firstCharToLowerCase(from.name);
    }
}
