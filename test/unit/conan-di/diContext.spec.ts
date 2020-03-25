import {expect} from "chai";
import {DiContextFactory} from "../../../src/conan-di/core/diContext";

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
            simpleBean: SimpleBean,
            complexBean: ComplexBean
        })).to.deep.eq({
            simpleBean: new SimpleBean(),
            complexBean: new ComplexBean(new SimpleBean())
        })
    })
});
