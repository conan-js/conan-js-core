import {TodoListState, TodoListStoreFactory} from "../../../todo/todoList.sm";
import {expect} from "chai";
import {ToDoStatus} from "../../../todo/domain";

describe('test todo list as in redux GS', () => {
    const INITIAL_TODO = {
        description: 'new',
        status: ToDoStatus.PENDING
    };

    it ('should work', (done)=>{

        let firstTimeUpdated: boolean = true;


        new TodoListStoreFactory ()
            .create()
            .addListener([`:todoListUpdated=>stop`, {
                onTodoListUpdated: (actions, params) => {
                    if (firstTimeUpdated) {
                        firstTimeUpdated = false;
                        actions.addTodo(INITIAL_TODO);
                        return;
                    }
                    return params.sm.stop();
                }
            }])
            .addListener([`::stop->test`, {
                onStop: (_, params)=> {
                    expect(params.sm.getState()).to.deep.eq ({
                        todos: [INITIAL_TODO],
                        appliedFilter: undefined
                    });
                    done();
                }
            }])
            .start('todo-list-store');
    })
});
