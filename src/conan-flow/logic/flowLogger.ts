import {FlowEvent, FlowEventLevel, FlowEventNature, FlowEventType} from "../domain/flowRuntimeEvents";
import {Strings} from "../../conan-utils/strings";
import {Rule} from "../../conan-utils/rules/_rules";
import {BaseRules} from "../../conan-utils/rules/baseRules";
import {IConsumer, IFunction, IProducer, IReducer} from "../..";

export class FlowLogger {
    constructor(
        private readonly Rule$: IProducer<Rule<FlowEvent>>
    ) {
    }

    log(event: FlowEvent): boolean {
        if (!this.Rule$().test(event)) {
            let customRule = event.flowController.flowDef.loggingRule;
            if (customRule) {
                if (!customRule.test(event)) {
                    return false;
                }
            } else {
                return false;
            }
        }

        let currentStatusName = event.flowController.getCurrentStatusName();
        currentStatusName = currentStatusName ? currentStatusName : '<stopped>';

        if (event.payload != null) {
            console.log(
                Strings.padEnd(`${event.type}`, 30),
                Strings.padEnd(`${event.flowController.getName()}`, 50),
                Strings.padEnd(`${currentStatusName}`, 30),
                Strings.padEnd(`${event.nature}`, 10),
                Strings.padEnd(`${event.level}`, 10),
                Strings.padEnd(`${event.timing}`, 12),
            );
            if (event.payload != null || event.shortDesc != null) {
                if (event.shortDesc != null && event.payload != null) {
                    console.log(`  =>${event.shortDesc}`);
                    console.log(' ', event.payload);
                } else if (event.shortDesc != null && !event.payload != null) {
                    console.log(`  =>${event.shortDesc}`);
                } else {
                    console.log(`  =>${event.payload}`);
                }
            }
            console.log('------------------------------------------------------------------------------------------------------------------------------------------------')
        } else if (event.shortDesc != null) {
            console.log(
                Strings.padEnd(`${event.type}`, 30),
                Strings.padEnd(`${event.flowController.getName()}`, 50),
                Strings.padEnd(`${currentStatusName}`, 30),
                Strings.padEnd(`${event.level}`, 10),
                Strings.padEnd(`${event.nature}`, 10),
                Strings.padEnd(`${event.timing}`, 10),
            );
            console.log(`  =>${event.shortDesc}`);
        }

        return true;
    }
}

export class LoggerFilters {
    static trace(): Rule<FlowEvent> {
        return BaseRules.if('ifTrace', (flowEvent) => flowEvent.level === FlowEventLevel.TRACE);
    }

    static debug(): Rule<FlowEvent> {
        return BaseRules.if('ifDebug', (flowEvent) => flowEvent.level === FlowEventLevel.DEBUG);
    }

    static milestone(): Rule<FlowEvent> {
        return BaseRules.if('ifMilestone', (flowEvent) => flowEvent.level === FlowEventLevel.MILESTONE);
    }

    static info(): Rule<FlowEvent> {
        return BaseRules.if('ifInfo', (flowEvent) => flowEvent.level === FlowEventLevel.INFO);
    }

    static logName(logName: string): Rule<FlowEvent> {
        return BaseRules.combineOr(
            `main/async/meta[${logName}]`,
            LoggerFilters.mainLogName(logName),
            LoggerFilters.asyncLogName(logName),
            LoggerFilters.metaLogName(logName),
        )
    }

    static mainLogName(logName: string): Rule<FlowEvent> {
        return BaseRules.if(`ifLogName={${logName}`, (flowEvent) => flowEvent.flowController.getName() === logName);
    }

    static asyncLogName(logName: string): Rule<FlowEvent> {
        return BaseRules.if(`ifLogName={${logName}`, (flowEvent) => flowEvent.flowController.getName() === `${logName}=>[async]`);
    }

    static metaLogName(logName: string): Rule<FlowEvent> {
        return BaseRules.if(`ifLogName={${logName}`, (flowEvent) => flowEvent.flowController.getName() === `${logName}=>[meta]`);
    }

    static eventType(eventType: FlowEventType): Rule<FlowEvent> {
        return BaseRules.combineAnd(
            `eventType[${eventType}]`,
            LoggerFilters.trace().inverse(),
            BaseRules.if(`ifEventType={${eventType}`, (flowEvent) => flowEvent.type === eventType),
        );
    }

    static statusName(statusName: string): Rule<FlowEvent> {
        return BaseRules.if(`ifStatusName={${statusName}`, (flowEvent) => flowEvent.flowController.getCurrentStatusName() === statusName);
    }

    static notInitialising(): Rule<FlowEvent> {
        return LoggerFilters.initialising().inverse();
    }


    static initialising(): Rule<FlowEvent> {
        return LoggerFilters.statusName('$init');
    }

    static nextData(): Rule<FlowEvent> {
        return LoggerFilters.statusName('nextData');
    }

    static aux(): Rule<FlowEvent> {
        return BaseRules.if(`ifAux`, (flowEvent) => flowEvent.nature === FlowEventNature.AUX)
    }

    static async(): Rule<FlowEvent> {
        return BaseRules.if(`ifAsync`, (flowEvent) => flowEvent.nature === FlowEventNature.ASYNC)
    }

    static helper(): Rule<FlowEvent> {
        return BaseRules.if(`ifHelper`, (flowEvent) => flowEvent.nature === FlowEventNature.HELPER)
    }

    static main(): Rule<FlowEvent> {
        return BaseRules.if(`ifMain`, (flowEvent) => flowEvent.nature === FlowEventNature.MAIN)
    }

    static all(): Rule<FlowEvent> {
        return BaseRules.if(`all`, () => true)
    }

    static fromInfo(): Rule<FlowEvent> {
        return BaseRules.combineOr(
            `info and milestone`,
            LoggerFilters.info(),
            LoggerFilters.milestone(),
        )
    }

    static allExceptTraces(): Rule<FlowEvent> {
        return BaseRules.combineOr(
            `all except traces`,
            LoggerFilters.debug(),
            LoggerFilters.info(),
            LoggerFilters.milestone(),
        )
    }

    static never(): Rule<FlowEvent> {
        return BaseRules.if(`never`, () => false)
    }

    static default(): Rule<FlowEvent> {
        return BaseRules.combineAnd(
            'default filter',
            LoggerFilters.milestone(),
            LoggerFilters.main(),
            LoggerFilters.initialising().inverse()
        )

    }
}

export const FLOW_LOGGER: FlowLogger = new FlowLogger(
    () => CURRENT_LOG_FILTER.rule
);

const CURRENT_LOG_FILTER = {
    rule: LoggerFilters.default()
}

export const updateLoggingFilter: IFunction<IReducer<Rule<FlowEvent>>, Rule<FlowEvent>> = (logFilterReducer: IReducer<Rule<FlowEvent>>): Rule<FlowEvent> => {
    let rule = logFilterReducer(CURRENT_LOG_FILTER.rule);
    CURRENT_LOG_FILTER.rule = rule;
    return rule;
}

export const setLoggingFilter: IConsumer<Rule<FlowEvent>> = (logFilter: Rule<FlowEvent>): void => {
    CURRENT_LOG_FILTER.rule = logFilter;
}

export const getLoggingFilter: IProducer<Rule<FlowEvent>> = (): Rule<FlowEvent> => {
    return CURRENT_LOG_FILTER.rule;
}
