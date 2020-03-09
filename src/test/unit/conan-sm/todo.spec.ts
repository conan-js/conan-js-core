import {TodoListState, TodoListStoreFactory} from "../../../todo/todoList.sm";
import {expect} from "chai";

describe('test todo list as in redux GS', () => {
    it ('should work', (done)=>{
        new TodoListStoreFactory ()
            .create()
            .addListener([`:todoListUpdated=>stop`, {
                onTodoListUpdated: (_, params) => params.sm.stop()
            }])
            .addListener([`::stop->test`, {
                onStop: (_, params)=> {
                    expect(
                        params.sm.getState()
                    ).to.deep.eq ({
                        todos: [],
                        appliedFilter: undefined
                    } as TodoListState);
                    done();
                }
            }])
            .start('todo-list-store');
    })
});
