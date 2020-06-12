import {expect} from "chai"
import {Flows} from "../../../../../src/core/conan-flow/factories/flows";

describe('simple flow', () => {
    it('should create a simple flow - add reactions - list events', () => {
        let timingCheck: string[] = [];

        let flow = Flows.create<{
            stringUpdated: string,
            letterC: void,
        }>({
            name: 'simple-flow',
            statuses: {
                stringUpdated: {
                    reactions: [onStringUpdated => {
                        let currentLetter = onStringUpdated.getData();
                        timingCheck.push(`onStringUpdated: ${currentLetter}`);
                        if (currentLetter === 'c') {
                            onStringUpdated.do.$toStatus('letterC')
                        }
                    }]
                },
                letterC: {},
            },
        });
        timingCheck.push('adding reaction: update to a');
        flow.onceOnInit(onInit => {
            timingCheck.push('executing reaction: update to a');
            onInit.do.$toStatus({
                data: 'a',
                name: 'stringUpdated'
            });
            timingCheck.push('adding reaction: update to b');
            flow.onceOn('stringUpdated', onStringUpdated => {
                timingCheck.push('executing reaction: update to b');
                onStringUpdated.do.$update('b');
                timingCheck.push('adding reaction: update to c');
                flow.onceOn<'stringUpdated'>('stringUpdated', onStringUpdated => {
                    timingCheck.push('executing reaction: update to c');
                    onStringUpdated.do.$update('c');
                }
            )})
        })
        .start()
        .stop(events => {
                expect(timingCheck).to.deep.eq([
                    "adding reaction: update to a",
                    "executing reaction: update to a",
                    "adding reaction: update to b",
                    "onStringUpdated: a",
                    "executing reaction: update to b",
                    "onStringUpdated: b",
                    "adding reaction: update to c",
                    "executing reaction: update to c",
                    "onStringUpdated: c",
                ]);
                expect(events.serialize()).to.deep.eq([
                    {
                        type: "STATUS",
                        status: {
                            name: "$init"
                        }
                    },
                    {
                        data: undefined,
                        type: "STATE"
                    },
                    {
                        type: "TRANSITION",
                        fromStatus: "$init",
                        intoStatus: {
                            name: "stringUpdated",
                            data: "a",
                        },
                        transitionName: "$toStatus",
                        transitionPayload: [{
                            name: "stringUpdated",
                            data: "a",
                        }]
                    },
                    {
                        type: "STATUS",
                        status: {
                            name: "stringUpdated",
                            data: "a",
                        }
                    },
                    {
                        data: "a",
                        type: "STATE"
                    },
                    {
                        type: "STEP",
                        newData: "b",
                        reducerName: "$update",
                        reducerPayload: ["b"],
                    },
                    {
                        type: "STATE",
                        data: "b",
                    },
                    {
                        type: "STEP",
                        newData: "c",
                        reducerName: "$update",
                        reducerPayload: ["c"],
                    },
                    {
                        type: "STATE",
                        data: "c",
                    },
                    {
                        type: "TRANSITION",
                        fromStatus: "stringUpdated",
                        intoStatus: {
                            name: "letterC"
                        },
                        transitionName: "$toStatus",
                        transitionPayload: ["letterC"]
                    },
                    {
                        type: "STATUS",
                        status: {
                            name: "letterC"
                        },
                    },
                    {
                        data: undefined,
                        type: "STATE"
                    },
                    {
                        type: "PROCESSING_STATUS",
                        status: {
                            name: "$stop"
                        }
                    },
                ]);
            }
        )
    })
})
