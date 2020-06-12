import {expect} from "chai";
import {DiContextFactory} from "../../../../src/core/conan-di/core/diContext";

describe('diContext', () => {
    class SimpleBean {
    }

    class ComplexBean {
        constructor (
            private readonly simpleBean: SimpleBean
        ){}
    }

    it ("should work with a simple bean", ()=>{
        interface TestContextDef {
            simpleBean: SimpleBean
        }

        expect(DiContextFactory.createContext<TestContextDef>({
            simpleBean: SimpleBean
        })).to.deep.eq({
            simpleBean: new SimpleBean()
        })
    });

    it ("should work with a complex bean", ()=>{
        interface TestContextDef {
            simpleBean: SimpleBean,
            complexBean: ComplexBean
        }

        expect(DiContextFactory.createContext<TestContextDef>({
            complexBean: ComplexBean,
            simpleBean: SimpleBean,
        })).to.deep.eq({
            simpleBean: new SimpleBean(),
            complexBean: new ComplexBean(new SimpleBean())
        })
    })

    it ("should work with a function", ()=>{
        expect(DiContextFactory.createContext<{complexBean: ComplexBean, simpleBean: SimpleBean} >({
            complexBean: (simpleBean)=>new ComplexBean(simpleBean),
            simpleBean: SimpleBean
        })).to.deep.eq({
            simpleBean: new SimpleBean(),
            complexBean: new ComplexBean(new SimpleBean())
        })

    })


    it ("should let us hardcore a value", ()=>{
        expect(DiContextFactory.createContext<{complexBean: ComplexBean, simpleBean: SimpleBean} >({
            complexBean: (simpleBean)=>new ComplexBean(simpleBean),
            simpleBean: new SimpleBean()
        })).to.deep.eq({
            simpleBean: new SimpleBean(),
            complexBean: new ComplexBean(new SimpleBean())
        })

    })

});
