import {Asap} from "../../conan-utils/asap";

export interface AsynAction<T> {
    name: string,
    payload: any,
    asap: Asap<T>,
}
