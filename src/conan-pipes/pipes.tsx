import * as React from "react";
import { ReactElement} from "react";
import {ConditionalRenderer} from "../conan-layout/renderers";
import {IBiFunction, IConsumer, IReducer} from "../conan-utils/typesHelper";

export interface Pipe<T> {
    createStream(name: string, stream?: IConsumer<Stream<T>>): Stream<T>;

    push(content: T): void;
}

export interface Stream<T> {
    open(content:ReactElement): void;

    close(): void;
}

export class Pipes {
    static createPipe<T> (name: string): Pipe<T> {
        return null;
    }
}

export interface MountPipeStreamProps<T> {
    mergeIntoContext?: string;
    pipe: Pipe<T>;
    link?: IBiFunction <T, boolean, ReactElement>
}

export function BindPipe<T> (props: MountPipeStreamProps<T>): ReactElement {
    return null;
}

interface ConditionallyBindPipeProps {
    pipe: Pipe<ReactElement>;
    renderer: IReducer<ReactElement>
}

export function ConditionallyBindPipe(props: ConditionallyBindPipeProps): ReactElement {
    return (
        <BindPipe
            pipe={props.pipe}
            link={(viewToMount, isStreamOpen) => (
                <ConditionalRenderer
                    conditions={[
                        [
                            () => viewToMount != null && isStreamOpen,
                            props.renderer
                        ]
                    ]}

                />
            )}
        />
    );
}

export class Pipelines {
    static create<T> (name: string, conf: any): Pipe<T> {
        return null;
    }
}
