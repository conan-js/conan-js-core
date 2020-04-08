import {IConsumer, IFunction, WithMetadataArray} from "../../conan-utils/typesHelper";
import {ForkService} from "../services/forkService";
import {StateMachineController} from "../stateMachineController";
import {State} from "../core/state";
import {SerializedSmEvent} from "../events/stateMachineEvents";
import {AsapParser} from "../../conan-utils/asap";
import {Proxyfier} from "../../conan-utils/proxyfier";


export enum ReactionType {
    ONCE = 'ONCE',
    ALWAYS = 'ALWAYS',
}

export interface ReactionMetadata {
    name: string,
    executionType: ReactionType,
}

export type NamedReactions<PATHS, DATA = any> = WithMetadataArray<Reaction<PATHS, DATA>, ReactionMetadata>
export type Reaction<PATHS, DATA = any, DEFERRER = any> = IConsumer<Reactor<PATHS, DATA, DEFERRER>>
export type PathRequester<PATHS> = IFunction<PATHS, State<any, any>>;
export type PathDeferrer<DEFERRER> = IConsumer<DEFERRER>;


export interface Reactor<
    PATHS = any,
    DATA = any,
    DEFERRER = any
> {
    stateName: string;
    stateData: DATA;
    paths: PATHS;
    events: SerializedSmEvent[];
    request (pathRequester: PathRequester<PATHS>): void;
    defer (pathRequester: PathDeferrer<DEFERRER>): void;
}

export interface DeferResult {
    pathName: string,
    result: any,
}

export class ReactorImpl<
    PATHS,
    DATA,
    DEFERRER
> implements Reactor<PATHS, DATA, DEFERRER> {
    constructor(
        private readonly state: State<string, DATA>,
        public readonly paths: PATHS,
        public readonly deferrer: DEFERRER,
        public readonly events: SerializedSmEvent[],
        private readonly forkService: ForkService,
        private readonly stateMachineController: StateMachineController<any>,
    ) {}

    request(pathRequester: PathRequester<PATHS>): void{
        let nextSate = pathRequester(this.paths);
        if (nextSate == null){
            throw new Error(`requesting a new state while on: ${this.stateName} - but it seen like no state was returned, did you min to defer instead?`)
        }
    }

    defer(pathDeferrer: PathDeferrer<DEFERRER>) {
        this.stateMachineController.assertForkable(forkSm=>{
            this.forkService.startFork(
                forkSm,
                this.stateMachineController,
                this.state
            )

            if (!this.deferrer){
                pathDeferrer(this.paths as any);
            } else {
                let enriched: any = Proxyfier.proxy(this.deferrer, (original, metadata)=>{
                    return {
                        pathName: metadata.methodName,
                        result: original()
                    } as DeferResult
                })
                let deferResult: DeferResult = pathDeferrer(enriched) as any;
                AsapParser.from(deferResult.result).ifPromise(
                    (promise)=> promise.then(value=>{
                        this.paths[deferResult.pathName] (value);
                    }),
                    (value)=> this.paths[deferResult.pathName] (value)
                );
            }

        });
    }

    public get stateName (): string {
        return this.state.name
    }

    public get stateData (): DATA {
        return this.state.data
    }
}
