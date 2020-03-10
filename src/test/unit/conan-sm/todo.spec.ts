import {TodoListData, TodoListStoreFactory, TodoListActions} from "../../../todo/todoList.sm";
import {expect} from "chai";
import {ToDo, ToDoStatus} from "../../../todo/domain";
import {ListenerType} from "../../../lib/conan-sm/stateMachineListeners";
import {SmController} from "../../../lib/conan-sm/_domain";

describe('test todo list as in redux GS', () => {
    const INITIAL_STATE: TodoListData = {
        todos: [],
        appliedFilter: undefined
    };

    const INITIAL_TODO: ToDo = {
        description: 'new',
        status: ToDoStatus.PENDING
    };

    it('should work', () => {
        let sm: SmController<any, any> = new TodoListStoreFactory()
            .create(INITIAL_STATE)
            .addListener([`::nextTodoList=>addTodo`, {
                onNextTodoList: (actions) => actions.addTodo(INITIAL_TODO)
            }], ListenerType.ONCE)
            .start('todo-list-store')
            .stop();

        expect(sm.getState()).to.deep.eq({
            todos: [INITIAL_TODO],
            appliedFilter: undefined
        });

    })
});
