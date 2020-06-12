import {expect} from 'chai';
import {DiRuntime} from "../../../../src/core/conan-di/core/diRuntime";
import {DiRuntimeFactory} from "../../../../src/core/conan-di/core/diRuntimeFactory";
import {InjectByName, InjectByType} from "../../../../src/core/conan-di/core/annotations/diAnnotations";
import {KeyValueCache} from "../../../../src/core/conan-utils/keyValueCache";

describe('beanRuntime', () => {
    let beanRuntime: DiRuntime;

    beforeEach(function () {
        beanRuntime = DiRuntimeFactory.create();
    });

    describe('happy scenarios - leaf', () => {

        function checkDeepEquality<T>(actualResultProvider: T, expectedResult: T) {
            expect(actualResultProvider).to.deep.eq(expectedResult)
        }

        it('parameterless bean', () => {
            class LeafBean {
                constructor() {}
            }

            checkDeepEquality(
                beanRuntime.invoke<LeafBean>(LeafBean, {}, {}),
                new LeafBean()
            );
        });

        describe('1 parameter - through context', () => {
            it('name guessed', () => {
                class SimpleBean {
                    constructor(
                        private readonly name: string
                    ) {}
                }

                checkDeepEquality(
                    beanRuntime.invoke<SimpleBean>(SimpleBean, {
                        name: 'a'
                    }, {}),
                    new SimpleBean('a')
                );
            });

            it('name overidden', () => {
                class SimpleBean {
                    constructor(
                        @InjectByName('theName') private readonly name: string
                    ) {}
                }

                let test: KeyValueCache = new KeyValueCache();
                test.resolve('test', () => 'test');

                checkDeepEquality(
                    beanRuntime.invoke<SimpleBean>(SimpleBean, {
                        theName: 'a'
                    }, {}),
                    new SimpleBean('a')
                );
            });
        });

        describe('2 parameters - through context', () => {
            it('names guessed', () => {
                class SimpleBean {
                    constructor(
                        private readonly name: string,
                        private readonly qty: number,
                    ) {
                    }
                }

                checkDeepEquality(
                    beanRuntime.invoke<SimpleBean>(SimpleBean, {
                        name: 'a',
                        qty: 1
                    }, {}),
                    new SimpleBean('a', 1)
                );
            });

            it('names overriden and guessed', () => {
                class SimpleBean {
                    constructor(
                        private readonly name: string,
                        @InjectByName('amount') private readonly qty: number,
                    ) {
                    }
                }

                checkDeepEquality(
                    beanRuntime.invoke<SimpleBean>(SimpleBean, {
                        name: 'a',
                        amount: 1
                    }, {}),
                    new SimpleBean('a', 1)
                );
            });
        });

        describe('properties', () => {
            it('should inject only properties', () => {
                interface Props {
                    readonly name: string;
                    readonly qty: number;
                }

                class SimpleBean {
                    constructor(
                        private $props: Props
                    ) {
                    }
                }

                checkDeepEquality(
                    beanRuntime.invokeWithProps<SimpleBean, Props>(SimpleBean, {
                        name: 'a',
                        qty: 1
                    }, {}, {}),
                    new SimpleBean({
                        name: 'a',
                        qty: 1
                    })
                );
            });

            it('should inject properties and beans', () => {
                interface Props {
                    readonly p1: string;
                    readonly p2: number;
                }

                class SimpleBean {
                    constructor(
                        private readonly name: string,
                        private $props: Props,
                        @InjectByName('amount') private readonly qty: number,
                    ) {
                    }
                }

                checkDeepEquality(
                    beanRuntime.invokeWithProps<SimpleBean, Props>(SimpleBean, {
                        p1: 'a',
                        p2: 1
                    }, {
                        name: 'a',
                        amount: 1
                    }, {}),
                    new SimpleBean('a',
                        {
                            p1: 'a',
                            p2: 1
                        },
                        1)
                );
            });
        });
    });

    describe('error scenarios - leaf', () => {
        it('should throw an error if parameter does not match a bean', () => {
            class LeafBean {
                constructor(
                    readonly unmatched: any
                ) {
                }
            }


            expect(beanRuntime.invoke.bind(beanRuntime, LeafBean)).throws();
        });

        it('should throw an error if props are not defined', () => {
            class LeafBean {
                constructor(
                    readonly $props: any
                ) {
                }
            }


            expect(beanRuntime.invoke.bind(beanRuntime, LeafBean, {$props: {}})).throws();
        });
    });

    describe('registering - diCache', () => {
        it('leaf - should return the same instance', () => {
            class LeafBean {
            }

            let original = beanRuntime.invoke(LeafBean, {}, {});
            expect(beanRuntime.invoke(LeafBean, {}, {})).to.eq(original);
        });

        it('nested - should return the same instance', () => {
            class LeafBean {
            }

            class Container {
                constructor(
                    @InjectByType(LeafBean) readonly leafBean: LeafBean
                ) {
                }
            }

            let original = beanRuntime.invoke(Container, {}, {});
            expect(beanRuntime.invoke(Container, {}, {}).leafBean).to.eq(original.leafBean);
        });
    });
});
