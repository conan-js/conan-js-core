export interface ToDo {
    description: string;
    status: ToDoStatus;
}

export enum ToDoStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED'
}
