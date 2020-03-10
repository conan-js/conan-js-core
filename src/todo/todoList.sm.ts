import {ToDo, ToDoStatus} from "./domain";
import {StateMachine} from "../lib/conan-sm/stateMachine";
import {ListenerType, OnEventCallback, SmListener} from "../lib/conan-sm/stateMachineListeners";
import {Stage} from "../lib/conan-sm/stage";

export interface TodoListData {
    todos: ToDo[];
    appliedFilter: ToDoStatus [];
}

export interface TodoListStartActions {
    doInitialise(initialState: TodoListData): TodoListUpdated;
}

export type TodoListUpdatedStageName = 'todoListUpdated';

export interface TodoListUpdated extends Stage <TodoListUpdatedStageName, TodoListData> {
}

export interface TodoListUpdatedActions {
    addTodo(todo: ToDo): void;

    filterAll(): void;

    filterByStatus(status: ToDoStatus): void;
}

export interface TodoListStoreListener extends SmListener<TodoListUpdatedActions | TodoListStartActions> {
    onStart?: OnEventCallback<TodoListStartActions>;
    onTodoListUpdated?: OnEventCallback<TodoListUpdatedActions>;
}


// BOILERPLATE TBR
export class TodoListStartActionsImpl implements TodoListStartActions {
    doInitialise(initialState: TodoListData): TodoListUpdated {
        return {
            state: "todoListUpdated",
            data: initialState
        };
    }

}

export class TodoListUpdatedActionsImpl implements TodoListUpdatedActions {
    constructor(
        private _currentState: TodoListData
    ) {
    }


    addTodo(todo: ToDo): TodoListUpdated {
        return {
            state: "todoListUpdated",
            data: {
                todos: [...this._currentState.todos, todo],
                appliedFilter: this._currentState.appliedFilter
            }
        };
    }

    filterAll(): TodoListUpdated {
        return {
            state: "todoListUpdated",
            data: {
                todos: this._currentState.todos,
                appliedFilter: undefined
            }
        };
    }

    filterByStatus(status: ToDoStatus): TodoListUpdated {
        return {
            state: "todoListUpdated",
            data: {
                todos: this._currentState.todos,
                appliedFilter: [status]
            }
        };
    }

}

// BOILERPLATE TBR

export type TodoListStore = StateMachine<TodoListStoreListener>;

export class TodoListStoreFactory {
    constructor(
        private readonly initialData: TodoListData
    ) {
    }

    create(): TodoListStore {
        return new StateMachine<TodoListStoreListener>()
            .withState<TodoListStartActions>('start', () => ({
                doInitialise(initialData): TodoListUpdated {
                    return {
                        state: "todoListUpdated",
                        data: initialData
                    }
                }
            }))
            .addListener([`::start=>doInitialise`, {
                onStart: (actions) => actions.doInitialise(this.initialData)
            },], ListenerType.ONCE)
            .withState<TodoListUpdatedActions>('todoListUpdated', TodoListUpdatedActionsImpl)
    }
}
