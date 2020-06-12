import {expect} from "chai"
import {Flows} from "../../../../../src/core/conan-flow/factories/flows";

describe('simple flow', () => {
    it('should create a simple flow - add reactions - list events', () => {
        let flowController = Flows.create<{
            stringUpdated: string,
            letterCReached: void,
        }>({
            name: 'simple-flow',
            statuses: {
                stringUpdated: {
                    reactions: [
                        onStringUpdated => {
                            let currentLetter = onStringUpdated.getData();
                            if (currentLetter === 'c') {
                                onStringUpdated.do.$toStatus('letterCReached')
                            }
                        }
                    ]
                },
                letterCReached: {}
            }
        });
        flowController.start()
        flowController.onInit().transitions.$toStatus({
            name: 'stringUpdated',
            data: 'a'
        })
        flowController.on('stringUpdated').steps.$update('b');
        flowController.on('stringUpdated').steps.$update('c');

        flowController.stop(events => {
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
                            name: "letterCReached"
                        },
                        transitionName: "$toStatus",
                        transitionPayload: ["letterCReached"]
                    },
                    {
                        type: "STATUS",
                        status: {
                            name: "letterCReached"
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
