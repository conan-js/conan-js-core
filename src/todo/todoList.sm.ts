import {ToDo, ToDoStatus} from "./domain";
import {StateMachine} from "../lib/conan-sm/stateMachine";
import {OnEventCallback, SmListener} from "../lib/conan-sm/stateMachineListeners";
import {Stage} from "../lib/conan-sm/stage";

export interface TodoListData {
    todos: ToDo[];
    appliedFilter: ToDoStatus [];
}

export interface NextTodoList extends Stage <'nextTodoList', TodoListData> {}

export interface TodoListActions {
    addTodo(todo: ToDo): NextTodoList;

    filterAll(): NextTodoList;

    filterByStatus(status: ToDoStatus): NextTodoList;
}

export interface TodoListListener extends SmListener<TodoListActions> {
    onNextTodoList?: OnEventCallback<TodoListActions>;
}

export let TodoListStoreFactory = (initialData: TodoListData): StateMachine<TodoListListener> =>
    new StateMachine<TodoListListener>()
        .withInitialState('nextTodoList', initialData)
        .withState<TodoListActions, TodoListData>('nextTodoList', (currentState) => ({
            addTodo: (todo: ToDo): NextTodoList => ({
                state: 'nextTodoList',
                data: {
                    todos: [...currentState.todos, todo],
                    appliedFilter: currentState.appliedFilter
                }
            }),
            filterAll: (): NextTodoList => ({
                state: 'nextTodoList',
                data: {
                    todos: currentState.todos,
                    appliedFilter: undefined
                }
            }),
            filterByStatus: (status: ToDoStatus): NextTodoList => ({
                state: 'nextTodoList',
                data: {
                    todos: currentState.todos,
                    appliedFilter: [status]
                }
            })
        }));
