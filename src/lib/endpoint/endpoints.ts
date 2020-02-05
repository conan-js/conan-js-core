import {IConsumer} from "../conan-utils/typesHelper";

export type EndpointCallback<T> = IConsumer <T>;
export interface Endpoint <Request, Response> {
    next (request: Request): Promise<Response>;
}
