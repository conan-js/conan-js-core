export type StatusLike<
    STATUSES_FROM = any,
    KEY extends keyof STATUSES_FROM = any,
> = Status<STATUSES_FROM, KEY> | keyof STATUSES_FROM


export interface Status <
    STATUSES_FROM = any,
    KEY extends keyof STATUSES_FROM = any,
> {
    name: KEY,
    data?: STATUSES_FROM[KEY],
}

export class StatusLikeParser {
    static parse<STATUSES = any, STATUS extends keyof STATUSES = any> (toParse: StatusLike<STATUSES, STATUS>): Status<STATUSES, STATUS>{
        if (typeof toParse === "string") return {
            name: toParse as any
        }
        return toParse as any;
    }
}
