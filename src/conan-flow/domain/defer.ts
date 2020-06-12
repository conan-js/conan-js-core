import {IConsumer} from "../..";
import {Asap, isAsap} from "../../conan-utils/asap";

export type DeferFn<MUTATORS> = Asap<IConsumer<MUTATORS>>;

export interface Defer<MUTATORS> {
    action: DeferFn<MUTATORS>;
    payload: any;
    name?: string;
}

export type DeferLike <MUTATORS> = Defer<MUTATORS> | DeferFn<MUTATORS>;

export interface Otherwise {
    name: string,
    payload: any
}

export function deferParser<MUTATORS>(deferLike: DeferLike <MUTATORS>, otherwise: Otherwise): Defer<MUTATORS> {
    if (!isAsap(deferLike as any)) return deferLike as any;
    return {
        action: deferLike as any,
        name: otherwise.name,
        payload: otherwise.payload
    }
}
