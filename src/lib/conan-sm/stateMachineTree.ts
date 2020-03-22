import {SmListener} from "./stateMachineListeners";
import {StageToProcess} from "./stateMachine";
import {SerializedSmEvent, SmTransition} from "./stateMachineEvents";
import {TransactionTree} from "../conan-tx/transactionTree";
import {EventType, StateMachineLogger} from "./stateMachineLogger";
import {StateMachineController} from "./stateMachineController";

export interface ParentRelationship {
    parent: StateMachineTree<any>;
    joinsIntoStages: string[];
}

export interface StateMachineEndpoint {
    requestStage(stageToProcess: StageToProcess): void;

    requestTransition(transition: SmTransition): void;
}

export class StateMachineTree<
    SM_ON_LISTENER extends SmListener,
> implements StateMachineLogger, StateMachineEndpoint {

    constructor(
        readonly controller: StateMachineController<any>,
    ) {}

    getStateData(): any {
        return this.controller.getStateData();
    }


    requestStage(stageToProcess: StageToProcess): this {
        this.controller.requestStage(stageToProcess.stage);
        return this;
    }

    requestTransition(transition: SmTransition): this {
        this.controller.requestTransition(transition);
        return this;
    }


    getEvents(): SerializedSmEvent [] {
        return this.controller.getEvents();
    }

    log(eventType: EventType, details?: string, additionalLines?: [string, string][]): void {
        throw new Error('TBI')
    }

}
