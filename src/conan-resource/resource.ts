import {Asap} from "../conan-utils/asap";

export interface Resource <T> {
    get(): Asap<T>;

    update(into: T): Asap<T>;
}
