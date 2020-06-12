import {expect} from "chai";
import {Threads} from "../../../../../src/core/conan-thread/factories/threads";
import {TodoListData, todoListReducers, TodoListReducers, ToDoStatus, VisibilityFilters} from "../../../utils/todos";
import {ThreadFacade} from "../../../../../src/core/conan-thread/domain/threadFacade";


describe(`todo`, function () {
    let todos: ThreadFacade<TodoListData, TodoListReducers> = Threads.create<TodoListData, TodoListReducers>({
        name: 'todos',
        initialData: {
            appliedFilter: VisibilityFilters.ALL,
            todos: []
        },
        reducers: todoListReducers
    })

    it(`should let us manage the TODOs`, () => {
        let firstTodo = {
            description: 'todo-1',
            id: '1',
            status: ToDoStatus.PENDING
        };

        todos.do.$addTodo(firstTodo);
        todos.do.$toggleTodo(firstTodo);
        todos.do.$filter(VisibilityFilters.PENDING);

        todos.stop(events =>{
            expect(
                events.serializeStates(
                    {excludeStop: true, excludeInit: true}
                ).map(it=>it.data)
            ).to.deep.eq([{
                    appliedFilter: VisibilityFilters.ALL,
                    todos: [],
                },
                {
                    appliedFilter: VisibilityFilters.ALL,
                    todos: [{
                        description: "todo-1",
                        id: "1",
                        status: ToDoStatus.PENDING
                    }]
                },
                {
                    appliedFilter: VisibilityFilters.ALL,
                    todos: [{
                        description: "todo-1",
                        id: "1",
                        status: ToDoStatus.COMPLETED
                    }]
                },
                {
                    appliedFilter: VisibilityFilters.PENDING,
                    todos: [{
                        description: "todo-1",
                        id: "1",
                        status: ToDoStatus.COMPLETED
                    }]
                }])
        });
    })



})
