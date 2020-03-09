import {ToDo, ToDoStatus} from "./domain";
import {StateMachineController} from "../lib/conan-sm/stateMachineController";
import {OnEventCallback, SmListener} from "../lib/conan-sm/stateMachineListeners";
import {Stage} from "../lib/conan-sm/stage";

export interface TodoListState {
    todos: ToDo[];
    appliedFilter: ToDoStatus [];
}

export interface TodoListActions {
    addTodo (todo: ToDo): void;
    filterAll (): void;
    filterByStatus (status: ToDoStatus): void;
}

export interface TodoListListener extends SmListener<TodoListActions>{
    onTodoListUpdated ?: OnEventCallback <TodoListActions>;
}

// BOILERPLATE TBR
export type TodoListUpdatedStageName = 'todoListUpdated';
export interface TodoListSm extends Stage <TodoListUpdatedStageName, TodoListState>{}
export class TodoListActionsImpl implements TodoListActions{
    constructor(
        private _currentState: TodoListState
    ) {}


    addTodo(todo: ToDo): TodoListSm {
        return {
            stage: "todoListUpdated",
            state: {
                todos: [...this._currentState.todos, todo],
                appliedFilter: this._currentState.appliedFilter
            }
        };
    }

    filterAll(): TodoListSm {
        return {
            stage: "todoListUpdated",
            state: {
                todos: this._currentState.todos,
                appliedFilter: undefined
            }
        };
    }

    filterByStatus(status: ToDoStatus): TodoListSm {
        return {
            stage: "todoListUpdated",
            state: {
                todos: this._currentState.todos,
                appliedFilter: [status]
            }
        };
    }

}
// BOILERPLATE TBR

export class TodoListStoreFactory {
    create(): StateMachineController<TodoListListener, {}, TodoListActions> {
        return new StateMachineController([
            `::start=>doUpdate`,
            {
                onStart: (_, params)=>
                    params.sm.requestTransition({
                        actionName: 'doInitialState',
                        transition: {
                            stage: 'todoListUpdated',
                            state: {
                                todos: [],
                                appliedFilter: undefined
                            } as any
                        }
                    })
            }
        ]).withStage<
                TodoListUpdatedStageName,
                TodoListActions,
                TodoListState
            >('todoListUpdated', TodoListActionsImpl)
    }
}
