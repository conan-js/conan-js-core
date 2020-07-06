
import {Flows} from "../../../../../src/core/conan-flow/factories/flows";
import {Mutators} from "../../../../../src/core/conan-flow/domain/mutators";
import {expect} from "chai";
import {Status, StatusLike} from "../../../../../src/core/conan-flow/domain/status";
import {StateEvent} from "../../../../../src/core/conan-flow/domain/flowEvents";


describe(`feature`, function () {
    it(`should let us map a feature`, () => {

        interface FeatureFlow {
            develop: string[];
            testing: number[];
            deploy: string
        }

        interface FeatureFlowMutators extends Mutators<FeatureFlow>{
            develop: {
                $appendCode (toAppend: string[]): string[],
                $toTesting (): StatusLike<FeatureFlow, 'testing'>
            },
            testing: {
                $appendBug (jiraNumber: number): number [],
                $toDevelop(): Status<FeatureFlow, 'develop'>,
                $toDeploy(version: string): StatusLike<FeatureFlow, 'deploy'>,
            },
            deploy: {
                $toDevelop (): Status<FeatureFlow, 'develop'>
            }
        }

        let feature = Flows.create<
            FeatureFlow,
            FeatureFlowMutators
        >({
            name: 'feature',
            statuses: {
                develop: {
                    steps: getData => ({
                        $appendCode(toAppend: string[]): string[] {
                            return [...getData(), ...toAppend]
                        }
                    }),
                    transitions: () => ({
                        $toTesting(): Status<FeatureFlow, "testing"> {
                            return {
                                name: "testing",
                                data: []
                            }
                        }
                    })
                },
                testing: {
                    steps: getData => ({
                        $appendBug(jiraNumber: number): number[] {
                            return [...getData(), jiraNumber]
                        }
                    }),
                    transitions: statusDataProducer => ({
                        $toDeploy(version: string): Status<FeatureFlow, "deploy"> {
                            return {
                                name: "deploy",
                                data: version
                            };
                        },
                        $toDevelop(): Status<FeatureFlow, "develop"> {
                            return {
                                name: "develop",
                                data: statusDataProducer ('develop', [])
                            }
                        }
                    })
                },
                deploy: {
                    transitions: statusDataProducer => ({
                        $toDevelop(): Status<FeatureFlow, "develop"> {
                            return {
                                name: "develop",
                                data: statusDataProducer ('develop', [])
                            }
                        }
                    })
                }
            },
            initialStatus: {
                name: 'develop',
                data: [`hello world`]
            }
        })

        feature.start();

        feature.onceOn("develop", (onDevelop)=> {
            onDevelop.do.$appendCode([`line 2`,`line 3`]);
            feature.onceOn("develop", (onDevelopCodeFinished) =>
                onDevelopCodeFinished.do.$toTesting()
            );
        })

        feature.onceOn("testing", (onTesting)=>{
            onTesting.do.$appendBug(1);
            feature.onceOn("testing", (onTestingAfterBugRaised)=>{
                onTestingAfterBugRaised.do.$toDevelop();
                feature.onceOn('develop', onDevelopFromTesting=>{
                    onDevelopFromTesting.do.$appendCode ([`line 4`]);
                    onDevelopFromTesting.do.$toTesting();
                    feature.onceOn("testing", onTestingBugFixed => {
                        onTestingBugFixed.do.$toDeploy ('1.0')
                    })
                })
            })
        })

        feature.stop(events =>{
            expect(
                events.serializeStatesWithStatus(
                    {excludeStop: true, excludeInit: true}
                ).map(it=>it.statusName + `[${(it.event as StateEvent).data}]`)
            ).to.deep.eq([
                "develop[hello world]",
                "develop[hello world,line 2,line 3]",
                "testing[]",
                "testing[1]",
                "develop[hello world,line 2,line 3]",
                "develop[hello world,line 2,line 3,line 4]",
                "testing[]",
                "deploy[1.0]",
            ])
        });
    })

})
