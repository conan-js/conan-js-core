export class Queue <T> {

    private readonly queuedElement: T[] = [];

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
        return this.queuedElement;
    }
}
