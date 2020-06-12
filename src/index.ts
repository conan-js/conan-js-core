//********************
//conan-sm-sugar
//********************

import {FlowDef} from "./conan-flow/def/flow/flowDef";

import {
    DynamicOrStatics,
    IBiConsumer,
    IBiFunction,
    ICallback,
    IConstructor,
    IConstructorProxy,
    IConsumer,
    IFunction,
    IFunctionVarArg,
    IKeyValuePairs,
    IOptSetKeyValuePairs,
    IPartial,
    IPredicate,
    IProducer,
    IReducer,
    ISetKeyValuePairs,
    ITriConsumer,
    IVarArgConstructor,
    ProvidedOrStaticOf,
    WithMetadata,
    WithMetadataArray,
    WithMetadataKeyValuePairs
} from "./conan-utils/typesHelper";
import {DiAnnotationsMetadataFactory} from "./conan-di/core/annotations/diAnnotatinosMetadataFactory"
import {diAnnotationsCrud, InjectByName, InjectByType, InjectDynamic} from "./conan-di/core/annotations/diAnnotations"
import {DiContextFactory} from "./conan-di/core/diContext"
import {useConantState, useContextConantState, useFlow, useFlowStatus} from "./conan-react/connect/conanHooks"
import {
    ContextStateConnect,
    contextStateConnect,
    ContextStateConnectProps,
    ContextStateMapConnect,
    contextStateMapConnect,
    ContextStateMapConnectProps
} from "./conan-react/connect/contextStateConnectMap"
import {
    ConnectedState,
    ReactStateContext,
    ReactWrapperProps,
    stateConnect,
    StateConnect,
    StateConnectProps,
    stateMapConnect,
    StateMapConnect
} from "./conan-react/connect/stateConnect"
import {
    ContextStateLive,
    contextStateLive,
    ContextStateLiveProps,
    StateLive,
    stateLive,
    StateLiveProps
} from "./conan-react/live/stateLive"
import {Conan, DefaultActions, DefaultReducers} from "./conan-react/conan"
import {ConanState} from "./conan-react/conanState"
import {MonitorInfo, MonitorStatus} from "./conan-monitor/domain/monitorInfo"
import {Asap, AsapLike, AsapParser, Asaps, AsapType, isAsap} from "./conan-utils/asap"
import {Reducers, ReducersFn} from "./conan-thread/domain/reducers"
import {Flows} from "./conan-flow/factories/flows"
import {ActionsFn, Then} from "./conan-thread/domain/threadActions"
import {Lists} from "./conan-utils/lists"

//********************
//conan-sm
//********************

export {FlowDef};


//********************
//conan-utils
//********************

export {
    ICallback,
    IConsumer,
    IBiConsumer,
    ITriConsumer,
    IConstructor,
    IFunction,
    IProducer,
    WithMetadata,
    IKeyValuePairs,
    WithMetadataArray,
    IBiFunction,
    ISetKeyValuePairs,
    DynamicOrStatics,
    IPredicate,
    IVarArgConstructor,
    IConstructorProxy,
    IFunctionVarArg,
    IOptSetKeyValuePairs,
    IPartial,
    IReducer,
    ProvidedOrStaticOf,
    WithMetadataKeyValuePairs,
}

//********************
//conan-di
//********************

export {DiAnnotationsMetadataFactory}

export {diAnnotationsCrud, InjectByName, InjectByType, InjectDynamic}

export {DiContextFactory}

export {useConantState, useContextConantState, useFlow, useFlowStatus}

export {
    ContextStateConnect,
    contextStateConnect,
    ContextStateConnectProps,
    ContextStateMapConnect,
    contextStateMapConnect,
    ContextStateMapConnectProps
}

export {
    stateMapConnect,
    StateMapConnect,
    StateConnectProps,
    stateConnect,
    ReactWrapperProps,
    ReactStateContext,
    ConnectedState,
    StateConnect
}

export {ContextStateLive, contextStateLive, ContextStateLiveProps, StateLive, stateLive, StateLiveProps}

export {Conan, DefaultActions, DefaultReducers}

export {ConanState}

export {MonitorInfo, MonitorStatus}

export {Asaps, Asap, AsapLike, AsapParser, AsapType, isAsap}

export {Reducers, ReducersFn}

export {Flows}

export {ActionsFn, Then}

export {Lists}
