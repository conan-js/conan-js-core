import {ToDo, ToDoStatus} from "./domain";
import {StateMachine} from "../lib/conan-sm/stateMachine";
import {OnEventCallback, SmListener} from "../lib/conan-sm/stateMachineListeners";
import {Stage} from "../lib/conan-sm/stage";

export interface TodoListData {
    todos: ToDo[];
    appliedFilter: ToDoStatus [];
}
export interface TodoListUpdated extends Stage <'todoListUpdated', TodoListData> {}
export interface TodoListActions {
    addTodo(todo: ToDo): TodoListUpdated;

    filterAll(): TodoListUpdated;

    filterByStatus(status: ToDoStatus): TodoListUpdated;
}

export interface TodoListStoreListener extends SmListener<TodoListActions> {
    onTodoListUpdated?: OnEventCallback<TodoListActions>;
}

export type TodoListStore = StateMachine<TodoListStoreListener>;
export class TodoListStoreFactory {
    constructor(
        private readonly initialData: TodoListData
    ) {
    }

    create(): TodoListStore {
        return new StateMachine<TodoListStoreListener>()
            .withInitialState('todoListUpdated', this.initialData)
            .withState<TodoListActions, TodoListData>('todoListUpdated', (currentState)=>({
                addTodo: (todo: ToDo): TodoListUpdated => ({
                    state: "todoListUpdated",
                    data: {
                        todos: [...currentState.todos, todo],
                        appliedFilter: currentState.appliedFilter
                    }
                }),
                filterAll: (): TodoListUpdated => ({
                    state: "todoListUpdated",
                    data: {
                        todos: currentState.todos,
                        appliedFilter: undefined
                    }
                }),
                filterByStatus: (status: ToDoStatus): TodoListUpdated => ({
                    state: "todoListUpdated",
                    data: {
                        todos: currentState.todos,
                        appliedFilter: [status]
                    }
                })
            }))
    }
}
