import {expect} from 'chai';
import {DiRuntime} from "../../../../src/core/conan-di/core/diRuntime";
import {DiRuntimeFactory} from "../../../../src/core/conan-di/core/diRuntimeFactory";
import {InjectByType, InjectDynamic} from "../../../../src/core/conan-di/core/annotations/diAnnotations";

describe('beanRuntime', () => {
    function checkDeepEquality<T>(actualResult: T, expectedResult: T) {
        expect(actualResult).to.deep.eq(expectedResult);
    }

    let beanRuntime: DiRuntime;

    beforeEach(function () {
        beanRuntime = DiRuntimeFactory.create();
    });

    describe('happy scenarios - composed', () => {


        it('two levels simple', () => {
            class LeafBean {
                constructor() {
                }
            }

            class ParentBean {
                constructor(
                    @InjectByType(LeafBean) readonly leafBean: LeafBean
                ) {
                }
            }

            checkDeepEquality(
                beanRuntime.invoke<ParentBean>(ParentBean, {}, {}),
                new ParentBean(new LeafBean())
            );
        });

        it('nested level with props', () => {
            interface LeafBeanProps {
                p1: string;
                p2: number;
            }

            class LeafBean {
                constructor(
                    readonly $props: LeafBeanProps
                ) {
                }
            }

            class ParentBean {
                constructor(
                    @InjectByType<LeafBeanProps>(LeafBean, ParentBean.leafBeanProps)
                    readonly leafBean: LeafBean
                ) {
                }

                static leafBeanProps(): LeafBeanProps {
                    return {
                        p1: 'a',
                        p2: 1
                    };
                }
            }

            checkDeepEquality(
                beanRuntime.invoke<ParentBean>(ParentBean, {}, {}),
                new ParentBean(new LeafBean({
                    p1: 'a',
                    p2: 1
                }))
            );

        });

        it('combination of beans and props', () => {
            interface LeafBeanProps {
                p1: string;
                p2: number;
            }

            class LeafBean {
                constructor(
                    readonly $props: LeafBeanProps,
                    readonly a: string
                ) {
                }
            }

            class ParentBean {
                constructor(
                    @InjectByType<LeafBeanProps>(LeafBean, ParentBean.leafBeanProps)
                    readonly leafBean: LeafBean,
                    readonly a: string,
                    readonly b: number
                ) {
                }

                static leafBeanProps(): LeafBeanProps {
                    return {
                        p1: 'a',
                        p2: 1
                    };
                }
            }

            // TODO Note that there is a bug introduced intentionally, this is a trap to prove that the tracker can
            // help fix issues
            checkDeepEquality(
                beanRuntime.invoke<ParentBean>(ParentBean, {a: 'a', b: 1}, {}),
                new ParentBean(new LeafBean({
                    p1: 'a',
                    p2: 1
                }, 'a'), 'a', 1)
            );
        });

    });

    describe('happy scenarios - circular', () => {
        it('simple circular', () => {
            class CircularDependency {
                constructor(
                    @InjectDynamic(() => StartingPoint) readonly startingPoint: StartingPoint
                ) {
                }
            }

            class StartingPoint {
                constructor(
                    @InjectByType(CircularDependency) readonly circularDependency: CircularDependency
                ) {
                }
            }

            let result: StartingPoint = beanRuntime.invoke<StartingPoint>(StartingPoint, {}, {});
            expect(result.circularDependency.startingPoint).to.eq (result);
        });
    });

});


