import {MonitorFacade} from "../../../../src/core/conan-monitor/domain/monitorFacade";
import {Monitors} from "../../../../src/core/conan-monitor/factories/monitors";
import {expect} from "chai";
import {LoggerFilters, setLoggingFilter} from "../../../../src/core/conan-flow/logic/flowLogger";
import {BaseRules} from "../../../../src/core/conan-utils/rules/baseRules";
import {Asaps} from "../../../../src/core";

describe(`simple monitor - meta`, function () {
    setLoggingFilter(BaseRules.combineOr(
        `default + counter(allExceptTraces) [meta]`,
        LoggerFilters.default(),
        BaseRules.combineAnd (
            `counter(allExceptTraces) [meta]`,
            BaseRules.combineOr (
                'meta or async',
                LoggerFilters.asyncLogName('counter'),
                LoggerFilters.metaLogName('counter'),
            ),
            LoggerFilters.milestone(),
            LoggerFilters.notInitialising()
        )
    ))


    it ('should work - simple', ()=> {
        let counter$: MonitorFacade<number> = Monitors.create<number>({
            name: 'counter',
        })

        let allStatusesCombined: string[] = [];

        counter$.metaFlow.reactOnStatusChanged((nextStatus) =>
            allStatusesCombined.push('META: ' + nextStatus.name)
        );

        counter$.mainThread.addReaction({
            name: `data-main`,
            dataConsumer: (data) => allStatusesCombined.push('MAIN: ' + data)
        })

        counter$.do.update(1)
        counter$.do.update(2)

        expect(allStatusesCombined).to.deep.eq([
            "META: init",
            "MAIN: 1",
            "META: running",
            "META: idle",
            "MAIN: 2",
            "META: running",
            "META: idle",
        ]);
    })


    it ('should work - reactions', ()=> {
        let counter$: MonitorFacade<number> = Monitors.create<number>({
            name: 'counter',
        })

        let allStatusesCombined: string[] = [];

        counter$.metaFlow.reactOnStatusChanged((nextStatus) =>
            allStatusesCombined.push('META: ' + nextStatus.name)
        );

        counter$.mainThread.addReaction({
            name: `test:storeData`,
            dataConsumer: (data) => allStatusesCombined.push('MAIN: ' + data)
        })

        counter$.once(() => {
                counter$.do.update(1);
                counter$.once(() => {
                        counter$.do.update(2);
                        counter$.once(() =>
                            counter$.do.update(3), 'update to 3'
                        )
                    }, 'update to 2'
                )
            }, 'update to 1'
        )

        counter$.do.update(0);

        expect(allStatusesCombined).to.deep.eq([
            "META: init",
            "MAIN: 0",
            "META: running",
            "MAIN: 1",
            "MAIN: 2",
            "MAIN: 3",
            "META: idle",
        ]);
    })

    it ('should work - transaction', (done)=> {
        let counter$: MonitorFacade<number> = Monitors.create<number>({
            name: 'counter',
        })

        let allStatusesCombined: string[] = [];

        counter$.metaFlow.reactOnStatusChanged((nextStatus) =>
            allStatusesCombined.push(`META: ${nextStatus.name} - ${nextStatus.data.transactionCount}`)
        );

        counter$.mainThread.addReaction({
            name: `test:storeData`,
            dataConsumer: (data) => allStatusesCombined.push('MAIN: ' + data)
        })

        counter$.transaction((actions)=>{
            actions.update(0);
            actions.update(1);
            actions.update(2);
            counter$.mainThread.monitor(
                Asaps.delayed<number>(3, 300),
                (number, actions)=>actions.$update(number),
            )
        }).then(data=> {
            try {
                expect(data).to.eq(3);
                expect(allStatusesCombined).to.deep.eq([
                    "META: init - 0",
                    "META: init - 1",
                    "MAIN: 0",
                    "META: running - 1",
                    "META: idleOnTransaction - 1",
                    "MAIN: 1",
                    "META: running - 1",
                    "META: idleOnTransaction - 1",
                    "MAIN: 2",
                    "META: running - 1",
                    "META: idleOnTransaction - 1",
                    "META: running - 1",
                    "MAIN: 3",
                    "META: idleOnTransaction - 1",
                ])
                done ()
            } catch (e) {
                done (e)
            }
        })



    })


})
