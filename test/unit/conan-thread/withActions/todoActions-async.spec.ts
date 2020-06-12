import {expect} from "chai";
import {Threads} from "../../../../../src/core/conan-thread/factories/threads";
import {
    MockTodoListServiceImpl,
    ToDo,
    TodoListData,
    todoListReducers,
    TodoListReducers,
    TodoListService,
    ToDoStatus,
    VisibilityFilters
} from "../../../utils/todos";
import {Then} from "../../../../../src/core/conan-thread/domain/threadActions";
import {IFunction} from "../../../../../src/core";
import {ThreadFacade} from "../../../../../src/core/conan-thread/domain/threadFacade";


describe(`todo`, function () {
    interface TodoActions {
        addTodo (todo: ToDo): Then<TodoListData>
        toggleTodo(todo: ToDo): Then<TodoListData>
    }

    type TodoThread = ThreadFacade<TodoListData, TodoListReducers, TodoActions>;

    let Todos$: IFunction<TodoListService, TodoThread> = (todoListService: TodoListService)=> Threads.create<TodoListData, TodoListReducers, TodoActions>({
        name: 'todos',
        initialData: todoListService.fetch().map<TodoListData>(todos=>({
            todos: todos,
            appliedFilter: VisibilityFilters.ALL
        })),
        reducers: todoListReducers,
        actions: thread=>({
            addTodo(todo: ToDo): Then<TodoListData> {
                return thread.monitor(
                    todoListService.addTodo(todo),
                    (todo, reducers)=>reducers.$addTodo(todo),
                    'addTodo',
                    todo
                );
            },
            toggleTodo(todo: ToDo): Then<TodoListData> {
                return thread.monitor(
                    todoListService.toggleTodo(todo),
                    (todo, reducers)=>reducers.$toggleTodo(todo),
                    'toggleTodo',
                    todo
                );
            }
        })
    })

    it(`should let us manage the TODOs`, (done) => {
        let todos = Todos$ (new MockTodoListServiceImpl());

        let firstTodo = {
            description: 'todo-1',
            id: '1',
            status: ToDoStatus.PENDING
        };

        todos.next(()=>{
            todos.do.addTodo(firstTodo).then(()=>
                todos.do.toggleTodo(firstTodo).then(()=> {
                    todos.do.$filter(VisibilityFilters.PENDING)
                    todos.next(()=>{
                        todos.stop(events => {
                            done();
                            expect(
                                events.serializeStates(
                                    {excludeStop: true, excludeInit: true}
                                ).map(it => it.data)
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
            );
        })
    })
})
