import {Asap} from "../conan-utils/asap";

export interface Resource <T> {
    get(): Asap<T>;
}
