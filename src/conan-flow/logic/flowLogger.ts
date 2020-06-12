import {FlowRuntimeEvent, FlowRuntimeEventTiming} from "../domain/flowRuntimeEvents";
import {Strings} from "../../conan-utils/strings";
import {IFunction} from "../..";

export interface LoggingOptions {
    highlight: boolean;
}

export class FlowLogger {
    constructor(
        private readonly filters: IFunction<FlowRuntimeEvent, boolean>[]
    ) {}



    log (event: FlowRuntimeEvent, loggingOptions: LoggingOptions): void{
        for (let filter of this.filters){
            if (!filter(event)){
                return;
            }
        }

        let currentStatusName = event.flowController.getCurrentStatusName();
        currentStatusName = currentStatusName? currentStatusName : '-';

        if (loggingOptions.highlight){
            console.log(
                Strings.padEnd(`${event.flowController.getName()}`, 30),
                Strings.padEnd(`${currentStatusName}`, 20),
                Strings.padEnd(`${event.runtimeEvent}`, 20),
                Strings.padEnd(`${event.timing}`, 20),
            );
            if (event.payload || event.shortDesc){
                if (event.shortDesc){
                    console.log(`  =>[${event.shortDesc}]`);
                    if (event.payload){
                        console.log(' ', event.payload);
                    }
                } else {
                    console.log(`  =>[${event.payload}]`);
                }
            }
            console.log('------------------------------------------------------------------------------------------------------------------------------------------------')
        }else if (event.shortDesc){
            console.log(
                Strings.padEnd(`${event.flowController.getName()}`, 30),
                Strings.padEnd(`${currentStatusName}`, 20),
                Strings.padEnd(`${event.runtimeEvent}`, 20),
                Strings.padEnd(`${event.timing}`, 20),
                Strings.padEnd(`=>${event.shortDesc}`, 30),
            );
        }
    }
}

export class LoggerFilters {
    static excludeByLogName (nameToExclude: string): IFunction<FlowRuntimeEvent, boolean> {
        return (logEvent) => logEvent.flowController.getName() !== nameToExclude
    }
    static excludeByEventTiming (eventTiming: FlowRuntimeEventTiming): IFunction<FlowRuntimeEvent, boolean> {
        return (logEvent) => logEvent.timing !== eventTiming
    }
}

export const FLOW_LOGGER: FlowLogger = new FlowLogger([
    LoggerFilters.excludeByEventTiming (FlowRuntimeEventTiming.REQUEST_END),
    LoggerFilters.excludeByEventTiming (FlowRuntimeEventTiming.REQUEST_START),
    LoggerFilters.excludeByLogName ('next-promise'),
]);
