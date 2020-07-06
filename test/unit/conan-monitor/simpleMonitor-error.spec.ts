import {expect} from "chai";
import {Monitors} from "../../../../src/core/conan-monitor/factories/monitors";
import {LoggerFilters, setLoggingFilter} from "../../../../src/core/conan-flow/logic/flowLogger";
import {BaseRules} from "../../../../src/core/conan-utils/rules/baseRules";
import {Reducers} from "../../../../src/core";

describe(`simple monitor - error`, function () {

    it ('should manage errors - simple', ()=> {
        setLoggingFilter(BaseRules.combineAnd('', LoggerFilters.fromInfo(), LoggerFilters.main()));

        interface CounterReducers extends Reducers<number>{
            $delta (toDelta: number): number
        }

        interface CounterActions extends Reducers<number>{
            delta (toDelta: number): number
        }


        let monitor = Monitors.create<number, CounterReducers, CounterActions>({
            name: `counter`,
            reducers: getData => ({
                $delta(toDelta: number): number {
                    throw new Error(`forced error`)
                    return getData() + toDelta;
                }
            }),
            initialData: 0
        })

        monitor.do.delta(1);

        expect(monitor.getData()).to.eq (0);
        expect(monitor.metaFlow.getCurrentStatusName() === 'error')
    })




})
