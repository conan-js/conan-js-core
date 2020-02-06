export class Queue <T> {

    private queuedElement: T[] = [];

    constructor(
        private readonly initialValues?: T[]
    ) {
        if (!this.initialValues) return;

        this.queuedElement = [...initialValues];
    }

    push(toPush: T) {
        this.queuedElement.push(toPush);
    }

    flush ():T[] {
        this.queuedElement = [];
        return this.queuedElement;
    }

    read() {
        return this.queuedElement;
    }
}
