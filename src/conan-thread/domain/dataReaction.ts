import {IConsumer} from "../..";

export interface DataReactionDef <DATA>{
    name: string,
    dataConsumer: IConsumer<DATA>
}

export interface DataReactionLock {
    release (): void;
}
