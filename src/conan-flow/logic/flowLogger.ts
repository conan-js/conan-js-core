import {FlowEvent, FlowEventTiming, FlowEventLevel, FlowEventNature} from "../domain/flowRuntimeEvents";
import {Strings} from "../../conan-utils/strings";
import {IFunction} from "../..";


export class FlowLogger {
    constructor(
        private readonly filters: IFunction<FlowEvent, boolean>[]
    ) {}



    log (event: FlowEvent): boolean{
        for (let filter of this.filters){
            if (!filter(event)){
                let customLogger = event.flowController.flowDef.logger;
                if (customLogger) {
                    if (!customLogger(event)){
                        return false;
                    }
                }else {
                    return false;
                }
            }
        }

        let currentStatusName = event.flowController.getCurrentStatusName();
        currentStatusName = currentStatusName ? currentStatusName : '-';

        if (event.payload != null){
            console.log(
                Strings.padEnd(`${event.runtimeEvent}`, 30),
                Strings.padEnd(`${event.flowController.getName()}`, 50),
                Strings.padEnd(`${currentStatusName}`, 30),
                Strings.padEnd(`${event.nature}`, 20),
                Strings.padEnd(`${event.level}`, 20),
            );
            if (event.payload != null || event.shortDesc != null){
                if (event.shortDesc != null && event.payload != null){
                    console.log(`  =>[${event.shortDesc}]`);
                    console.log(' ', event.payload);
                } else if (event.shortDesc != null && !event.payload != null) {
                    console.log(`  =>[${event.shortDesc}]`);
                }else{
                    console.log(`  =>[${event.payload}]`);
                }
            }
            console.log('------------------------------------------------------------------------------------------------------------------------------------------------')
        }else if (event.shortDesc != null){
            console.log(
                Strings.padEnd(`${event.runtimeEvent}`, 30),
                Strings.padEnd(`${event.flowController.getName()}`, 50),
                Strings.padEnd(`${currentStatusName}`, 30),
                Strings.padEnd(`${event.level}`, 20),
                Strings.padEnd(`${event.nature}`, 20),
                Strings.padEnd(`=>${event.shortDesc}`, 60),
            );
        }

        return true;
    }
}

export class LoggerFilters {
    static logDebug (): IFunction<FlowEvent, boolean> {
        return LoggerFilters.excludeByEventLevel(FlowEventLevel.TRACE);
    }
    static excludeByLogName (nameToExclude: string): IFunction<FlowEvent, boolean> {
        return (logEvent) => logEvent.flowController.getName() !== nameToExclude
    }
    static excludeByEventTiming (eventTiming: FlowEventTiming): IFunction<FlowEvent, boolean> {
        return (logEvent) => logEvent.timing !== eventTiming
    }
    static excludeByEventLevel (eventLevel: FlowEventLevel): IFunction<FlowEvent, boolean> {
        return (logEvent) => logEvent.level !== eventLevel
    }
    static excludeByNature (nature: FlowEventNature): IFunction<FlowEvent, boolean> {
        return (logEvent) => logEvent.nature !== nature
    }
    static excludeByStatusName (name: string): IFunction<FlowEvent, boolean> {
        return (logEvent) => logEvent.flowController.getCurrentStatusName() !== name
    }
}

export const FLOW_LOGGER: FlowLogger = new FlowLogger([
    LoggerFilters.excludeByEventTiming (FlowEventTiming.END),
    LoggerFilters.excludeByEventTiming (FlowEventTiming.START),
    LoggerFilters.excludeByEventLevel (FlowEventLevel.TRACE),
    LoggerFilters.excludeByEventLevel (FlowEventLevel.INFO),
    LoggerFilters.excludeByEventLevel (FlowEventLevel.DEBUG),
    LoggerFilters.excludeByNature (FlowEventNature.AUX),
    LoggerFilters.excludeByNature (FlowEventNature.HELPER),
    LoggerFilters.excludeByNature (FlowEventNature.ASAP),
    LoggerFilters.excludeByStatusName ('$init'),
]);
