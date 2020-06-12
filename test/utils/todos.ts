import {Reducers, ReducersFn} from "../../../src/core/conan-thread/domain/reducers";
import {Asap, Asaps} from "../../../src/core/conan-utils/asap";

export enum VisibilityFilters {
    ALL = "ALL",
    PENDING = "PENDING",
}

export enum ToDoStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
}

export interface ToDo {
    id: string;
    status: ToDoStatus;
    description: string;
}

export interface TodoListData {
    todos: ToDo[];
    appliedFilter: VisibilityFilters;
}

export interface TodoListReducers extends Reducers<TodoListData>{
    $toggleTodo(todo: ToDo): TodoListData;

    $addTodo(todo: ToDo): TodoListData;

    $filter(filter: VisibilityFilters): TodoListData;
}


export const todoListReducers: ReducersFn<TodoListData, TodoListReducers> = getState => ({
    $toggleTodo: (toggledTodo: ToDo): TodoListData => ({
        todos: getState().todos.map(todo =>
            todo.id !== toggledTodo.id ? todo : {
                ...todo,
                status: (todo.status === ToDoStatus.PENDING ? ToDoStatus.COMPLETED : ToDoStatus.PENDING)
            },
        ),
        appliedFilter: getState().appliedFilter
    }),
    $addTodo: (todo: ToDo): TodoListData => ({
        todos: [...getState().todos, todo],
        appliedFilter: getState().appliedFilter
    }),
    $filter: (filter: VisibilityFilters): TodoListData => (
        {
            todos: getState().todos,
            appliedFilter: filter
        })
})


export interface TodoListService {
    fetch(): Asap<ToDo[]>;

    addTodo(todo: ToDo): Asap<ToDo>;

    toggleTodo(todo: ToDo): Asap<ToDo>;
}

export class MockTodoListServiceImpl implements TodoListService{
    public fetch(): Asap<ToDo[]> {
        return Asaps.delayed([], 100);
    }

    public addTodo(todo: ToDo): Asap<ToDo> {
        return Asaps.delayed(todo, 100);
    }

    public toggleTodo(todo: ToDo): Asap<ToDo> {
        return Asaps.delayed(todo, 100);
    }
}
