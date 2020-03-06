import {ToDo, ToDoStatus} from "./domain";
import {StateMachineTreeBuilder} from "../lib/conan-sm/stateMachineTreeBuilder";
import {SmListener} from "../lib/conan-sm/stateMachineListeners";
import {Stage} from "../lib/conan-sm/stage";

export interface TodoState {
    todos: ToDo[];
    appliedFilter: ToDoStatus [];
}

export interface TodoSmActions {
    addTodo (todo: ToDo): UpdatedStage;
    filterAll (): UpdatedStage;
    filterByStatus (status: ToDoStatus): UpdatedStage;
}

export interface TodoSmListener extends SmListener<TodoSmActions>{
    onUpdated (): UpdatedStage
}

export type UpdatedStageName = 'updated';
export interface UpdatedStage extends Stage <UpdatedStageName, TodoState>{}

export class TodoActionsLogic implements TodoSmActions{
    constructor(
        private _currentState: TodoState
    ) {}


    addTodo(todo: ToDo): UpdatedStage {
        return {
            name: "updated",
            requirements: {
                todos: [...this._currentState.todos, todo],
                appliedFilter: this._currentState.appliedFilter
            }
        };
    }

    filterAll(): UpdatedStage {
        return {
            name: "updated",
            requirements: {
                todos: this._currentState.todos,
                appliedFilter: undefined
            }
        };
    }

    filterByStatus(status: ToDoStatus): UpdatedStage {
        return {
            name: "updated",
            requirements: {
                todos: this._currentState.todos,
                appliedFilter: [status]
            }
        };
    }

}

export class TodoStoreSm {
    define(): StateMachineTreeBuilder<TodoSmListener, {}, TodoSmActions> {
        return new StateMachineTreeBuilder([`onStart=>::settled`, undefined])
            .withStage<
                UpdatedStageName,
                TodoSmActions,
                TodoState
            >('updated', TodoActionsLogic)

    }
}
