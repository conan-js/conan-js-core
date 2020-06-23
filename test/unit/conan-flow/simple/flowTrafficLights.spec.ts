import {Flows} from "../../../../../src/core/conan-flow/factories/flows";
import {expect} from "chai";
import {Status} from "../../../../../src/core/conan-flow/domain/status";
import {Mutators} from "../../../../../src/core/conan-flow/domain/mutators";


describe(``, function () {
    it(`should let us do a traffic light`, (done) => {
        interface TrafficLightsFlow {
            red: number;
            green: number;
            amber: number;
        }

        interface TrafficLightsMutators extends Mutators<TrafficLightsFlow>{
            red: {
                $toGreenLight (): Status<TrafficLightsFlow, 'green'>
            };
            green: {
                $toAmberLight (): Status<TrafficLightsFlow, 'amber'>
            };
            amber: {
                $toRedLight (): Status<TrafficLightsFlow, 'red'>
            };
        }


        let trafficLights = Flows.create<
            TrafficLightsFlow,
            TrafficLightsMutators
        >({
            name: 'traffic-lights',
            statuses: {
                red:  {
                    reactions: [
                        onRedLight => onRedLight.log ('red: ' + onRedLight.getData()),
                        onRedLight => setTimeout(()=>onRedLight.do.$toGreenLight(), 100)
                    ],
                    transitions: getStatusData =>({
                        $toGreenLight (): Status<TrafficLightsFlow, 'green'> {
                            return {
                                name: 'green',
                                data: getStatusData('green', 0) + 1
                            }
                        }
                    })
                },
                green: {
                    reactions: [
                        onGreenLight => onGreenLight.log('green: ' + onGreenLight.getData()),
                        onGreenLight => setTimeout(()=>onGreenLight.do.$toAmberLight(), 100)
                    ],
                    transitions: getStatusData =>({
                        $toAmberLight (): Status<TrafficLightsFlow, 'amber'> {
                            return {
                                name: 'amber',
                                data: getStatusData('amber', 0) + 1
                            }
                        }
                    })

                },
                amber: {
                    reactions: [
                        onAmberLight => onAmberLight.log('amber: ' + onAmberLight.getData()),
                        onAmberLight => setTimeout(()=>onAmberLight.do.$toRedLight(), 20)
                    ],
                    transitions: getStatusData =>({
                        $toRedLight (): Status<TrafficLightsFlow, 'red'> {
                            return {
                                name: 'red',
                                data: getStatusData('red', 0) + 1
                            }
                        }
                    })
                },
            },
            initialStatus: {
                name: 'red',
                data: 1
            }
        })

        trafficLights.alwaysOn('red', onRed => {
                if (onRed.getData() === 3) {
                    onRed.interruptFlow();
                }
            }
        );

        trafficLights.onceOnStop(() => {
                done();
                expect(
                    trafficLights
                        .getEvents()
                        .serializeStatuses({excludeInit: true, excludeStop: true})
                        .map(it=> it.status.name + `[${it.status.data}]`)
                ).to.deep.eq([
                    'red[1]', 'green[1]', 'amber[1]', 'red[2]', 'green[2]', 'amber[2]', 'red[3]'
                ]);
            }
        );

        trafficLights.start();
    })

})
