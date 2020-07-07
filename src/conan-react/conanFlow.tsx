import {FlowFacade} from "../conan-flow/domain/flowFacade";
import {Mutators, VoidMutators} from "../conan-flow/domain/mutators";
import {StatusDef} from "../conan-flow/def/status/statusDef";
import {Conan, ConanState, IConsumer} from "../index";
import {Status, StatusLike} from "../conan-flow/domain/status";
import {ReactionCb} from "../conan-flow/def/reactionDef";

export class ConanFlow<USER_STATUSES, USER_MUTATORS extends Mutators<USER_STATUSES> = VoidMutators<USER_STATUSES>, ACTIONS = void> {
    constructor(
        private readonly flow: FlowFacade<USER_STATUSES, USER_MUTATORS, ACTIONS>
    ) {}

    on<STATUS extends keyof USER_STATUSES>(statusName: STATUS): StatusDef<USER_STATUSES, STATUS> {
        return this.flow.on(statusName);
    }

    reactOnStatusChanged(customReaction: IConsumer<Status<USER_STATUSES>>): this{
        this.flow.reactOnStatusChanged(customReaction);
        return this;
    }

    alwaysOn<STATUS extends keyof USER_STATUSES & keyof USER_MUTATORS>(stateName: STATUS, def: ReactionCb<USER_STATUSES, STATUS, USER_MUTATORS>): this{
        this.flow.alwaysOn(stateName, def);
        return this;
    }

    start(initialStatus?: StatusLike<USER_STATUSES>): this{
        this.flow.start(initialStatus);
        return this;
    }

    toStateAll(): ConanState <Status>{
        let conanState = Conan.state<Status>({
            name: `${this.flow.getName()}=>[all statuses]`
        });

        this.reactOnStatusChanged(status=>conanState.do.update(status));

        return conanState;
    }

    toState<STATUS extends keyof USER_STATUSES> (statusName: STATUS): ConanState<USER_STATUSES[STATUS]> {
        let conanState = Conan.light<USER_STATUSES[STATUS]>(`${this.flow.getName()}=>[states:${statusName}]`);

        this.alwaysOn(statusName, (state)=>conanState.do.update(state.getData()));

        return conanState;
    }
}
