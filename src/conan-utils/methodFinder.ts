export class MethodFinder {

    static exists(theObject: any, methodName: string): boolean {
        if (theObject == null) return false;
        return this.find(theObject, methodName).length > 0;
    }

    static find(theObject: any, pattern: string = ''): string[] {
        let prototype = Object.getPrototypeOf(theObject);
        let methodHost = prototype.constructor.name === 'Object' ? theObject : prototype;
        let ownPropertyNames = Object.getOwnPropertyNames(methodHost);
        return ownPropertyNames.filter(it => it.startsWith(pattern));
    }
}
