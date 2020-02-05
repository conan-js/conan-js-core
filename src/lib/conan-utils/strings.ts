export class Strings {
    static firstCharToLowerCase (from: string): string {
        return from.substring(0, 1).toLowerCase() + from.substring(1, from.length);
    }

    static firstCharToUpperCase (from: string): string {
        return from.substring(0, 1).toUpperCase() + from.substring(1, from.length);
    }

    static camelCaseWithPrefix (prefix: string, from: string): string {
        return prefix + this.firstCharToUpperCase(from);
    }

    static repeat(s: string, repeats: number) {
        let result: string = '';
        for (let i: number = 0; i < repeats; i++) {
            result += s;
        }
        return result;
    }

    static padEnd (s: string, positions: number): string {
        let toAdd:number = positions - s.length;
        if (toAdd < 1) {
            return s.substring(0, positions);
        } else {
            return s + " ".repeat(toAdd)

        }
    }
}
