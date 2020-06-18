import {expect} from "chai";
import {Then} from "../../../../src/core/conan-thread/domain/threadActions";
import {
    MockTodoListServiceImpl,
    ToDo,
    TodoListData,
    todoListReducers,
    TodoListReducers,
    TodoListService,
    ToDoStatus,
    VisibilityFilters
} from "../../utils/todos";
import {IFunction} from "../../../../src/core";
import {Monitors} from "../../../../src/core/conan-monitor/factories/monitors";
import {MonitorFacade} from "../../../../src/core/conan-monitor/domain/monitorFacade";
import {Pipes} from "../../../../src/core/conan-pipe/factories/pipes";
import {Lists} from "../../../../src/core/conan-utils/lists";
import {MonitorStatus} from "../../../../src/core/conan-monitor/domain/monitorInfo";

enum OptimisticStatus {
    SETTLED= 'SETTLED',
    IN_PROCESS= 'IN_PROCESS',
}

interface OptimisticData<T> {
    data: T;
    status: OptimisticStatus;
}

interface OptimisticTodoListData {
    todos: OptimisticData<ToDo>[];
    appliedFilter: VisibilityFilters;
}

describe(`todo`, function () {
    interface TodoActions {
        addTodo (todo: ToDo): Then<TodoListData>
        toggleTodo(todo: ToDo): Then<TodoListData>
    }


    type TodoMonitor = MonitorFacade<TodoListData, TodoListReducers, TodoActions>;

    let Todos$: IFunction<TodoListService, TodoMonitor> = (todoListService: TodoListService)=> {
        return Monitors.create<TodoListData, TodoListReducers, TodoActions>({
            name: 'todos',
            initialData: todoListService.fetch().map<TodoListData>(todos => ({
                todos: todos,
                appliedFilter: VisibilityFilters.ALL
            })),
            reducers: todoListReducers,
            actions: thread => ({
                addTodo(todo: ToDo): Then<TodoListData> {
                    return thread.monitor(
                        todoListService.addTodo(todo),
                        (todo, reducers) => reducers.$addTodo(todo),
                        'addTodo',
                        todo
                    );
                },
                toggleTodo(todo: ToDo): Then<TodoListData> {
                    return thread.monitor(
                        todoListService.toggleTodo(todo),
                        (todo, reducers) => reducers.$toggleTodo(todo),
                        'toggleTodo',
                        todo
                    );
                }
            })
        });
    }


    let firstTodo = {
        description: 'todo-1',
        id: '1',
        status: ToDoStatus.PENDING
    };

    it(`should let us manage the TODOs`, (done) => {
        let optimisticData: OptimisticTodoListData[] = [];
        let todos$ = Todos$ (new MockTodoListServiceImpl());

        let optimisticTodoListData$ = Pipes.fromMonitor<TodoListData, OptimisticTodoListData>(
            todos$,
            (monitorInfo, data, current)=>{
                if (monitorInfo.status !== MonitorStatus.ASYNC_START) {
                    return current;
                }

                return {
                    appliedFilter: current.appliedFilter,
                    todos: [...current.todos, {
                        status: OptimisticStatus.IN_PROCESS,
                        data: monitorInfo.currentAction.payload
                    }]
                };
            },
            (data, monitoInfo
             , current)=>({
                appliedFilter: data.appliedFilter,
                todos: Lists.mergeCombine(
                    data.todos,
                    current.todos,
                    (todo, optimisticTodo)=> todo.id === optimisticTodo.data.id,
                    (todo, optimisticTod)=>({
                            status: OptimisticStatus.SETTLED,
                            data: todo
                        })
                ),
            }),
            {
                initialData: {
                    appliedFilter: VisibilityFilters.ALL,
                    todos: []
                }
            }
        );

        optimisticTodoListData$.addReaction({
            name: ``,
            dataConsumer: data=>optimisticData.push(data)
        })

        todos$.next(()=>{
            todos$.do.addTodo(firstTodo).then(()=>
                todos$.do.toggleTodo(firstTodo).then(()=> {
                    todos$.do.$filter(VisibilityFilters.PENDING)
                    todos$.next(()=>{
                        todos$.stop(events => {
                            done();
                            expect(
                                optimisticData
                            ).to.deep.eq([
                                {
                                    "appliedFilter": "ALL",
                                    "todos": []
                                },
                                {
                                    "appliedFilter": "ALL",
                                    "todos": [
                                        {
                                            "status": "IN_PROCESS",
                                            "data": {
                                                "description": "todo-1",
                                                "id": "1",
                                                "status": "PENDING"
                                            }
                                        }
                                    ]
                                },
                                {
                                    "appliedFilter": "ALL",
                                    "todos": [
                                        {
                                            "status": "SETTLED",
                                            "data": {
                                                "description": "todo-1",
                                                "id": "1",
                                                "status": "PENDING"
                                            }
                                        }
                                    ]
                                },
                                {
                                    "appliedFilter": "ALL",
                                    "todos": [
                                        {
                                            "status": "SETTLED",
                                            "data": {
                                                "description": "todo-1",
                                                "id": "1",
                                                "status": "PENDING"
                                            }
                                        },
                                        {
                                            "status": "IN_PROCESS",
                                            "data": {
                                                "description": "todo-1",
                                                "id": "1",
                                                "status": "PENDING"
                                            }
                                        }
                                    ]
                                },
                                {
                                    "appliedFilter": "ALL",
                                    "todos": [
                                        {
                                            "status": "SETTLED",
                                            "data": {
                                                "description": "todo-1",
                                                "id": "1",
                                                "status": "COMPLETED"
                                            }
                                        },
                                        {
                                            "status": "SETTLED",
                                            "data": {
                                                "description": "todo-1",
                                                "id": "1",
                                                "status": "COMPLETED"
                                            }
                                        }
                                    ]
                                },
                                {
                                    "appliedFilter": "PENDING",
                                    "todos": [
                                        {
                                            "status": "SETTLED",
                                            "data": {
                                                "description": "todo-1",
                                                "id": "1",
                                                "status": "COMPLETED"
                                            }
                                        },
                                        {
                                            "status": "SETTLED",
                                            "data": {
                                                "description": "todo-1",
                                                "id": "1",
                                                "status": "COMPLETED"
                                            }
                                        }
                                    ]
                                }
                            ])
                        });
                    })
                })
            );
        })
    })
})
