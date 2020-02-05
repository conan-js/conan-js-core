import {ReactElement} from "react";
import {BindDatumPipeLine, Datum, Datums} from "../../lib/datum/bindDatumPipeLine";
import * as React from "react";
import {Pipe, Pipelines} from "../../lib/pipes/pipes";



export function LoginDatums(props: any): ReactElement {
    let loginDatumPipe: Pipe<Datum> = Pipelines.create('loginDatumPipe', {
        initialising: (defaultValue)=>{

        },
        updating: (newValue)=>{

        }
    });
    return (
        <Datums>
            <BindDatumPipeLine
                name={'login'}
                steps={{
                    touched: (previousDatumImage, thisValue) => null,
                    validation: null
                }}
            />
            <BindDatumPipeLine
                name={'password'}
                pipeline={{
                    defaultValue: null,
                    touched: null,
                    validation: null
                }}
            />
        </Datums>
    );
}
