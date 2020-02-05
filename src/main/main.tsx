import {MainContainer} from "./front/main.container";
import * as React from "react";
import * as ReactDom from "react-dom";
import {prodConf} from "./conf/prod";


ReactDom.render(
    <MainContainer
        {...prodConf}
    />,
    document.getElementById('root')
);
