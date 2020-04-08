import {SmListener} from "./events/stateMachineListeners";
import {StateMachineDef, SyncStateMachineDef} from "./stateMachineDef";
import {StateMachine, StateMachineImpl, StateMachineType} from "./stateMachine";
import {TransactionTree} from "../conan-tx/transactionTree";
import {ForkStateMachineBuilder$, ForkStateMachineListener} from "./prototypes/forkStateMachine";
import {StateMachineCoreFactory} from "./core/stateMachineCoreFactory";
import {StateMachineCoreDef} from "./core/stateMachineCoreDef";
import {StateMachineCore} from "./core/stateMachineCore";
import {theOrchestrator} from "./wiring/singletons";
import {EventType, Logger$} from "./logging/stateMachineLogger";
import {SmEventsSerializer, SmEventsSerializerFactory} from "./events/smEventsSerializer";
import {FlowStateMachineBuilder$, FlowStateMachineListener} from "./prototypes/flowStateMachine";
import {StateMachineFacade} from "../stateMachineFacade";
import {AsapLike} from "../conan-utils/asap";
import {State} from "./core/state";

export interface Synchronisation {
    syncDef: SyncStateMachineDef<any, any>;
    tree: StartSmTree;
}

export interface StartSmTree {
    stateMachineTreeDef: StateMachineDef<any>;
    downSyncs: Synchronisation[];
}


export class StateMachineFactory {
    static create<
        SM_ON_LISTENER extends SmListener,
        STARTER = AsapLike<State<any>>
    >(
        stateMachineDef: StateMachineDef<SM_ON_LISTENER, STARTER>,
        smForkOpt?: StateMachine<ForkStateMachineListener>
    ): StateMachineFacade<SM_ON_LISTENER, STARTER> {
        let mainForkSm = smForkOpt != null ? smForkOpt : this.createForkSm(stateMachineDef.rootDef.name, StateMachineType.USER_FORK);
        let finalStateMachine: StateMachineImpl<SM_ON_LISTENER> = this.createForkableSm(
            stateMachineDef,
            mainForkSm,
            StateMachineType.USER
        );

        let flowForkSm = this.createForkSm('flow', StateMachineType.FLOW_FORK);
        let flowStateMachine: StateMachine<FlowStateMachineListener> = this.createForkableSm(
            FlowStateMachineBuilder$({
                mainForkSm: mainForkSm,
                mainSm: finalStateMachine,
                thisForkSm: flowForkSm,
            }).build(),
            flowForkSm,
            StateMachineType.FLOW,
        );

        finalStateMachine.flowSm = flowStateMachine;
        flowStateMachine.requestState({name: 'init'});

        return new StateMachineFacade<SM_ON_LISTENER, STARTER>(
            finalStateMachine,
            stateMachineDef.mapper ? stateMachineDef.mapper : (value)=> (value as any)
        );
    }

    public static createSimpleSm<SM_ON_LISTENER extends SmListener>(
        def: StateMachineDef<SM_ON_LISTENER>,
        type: StateMachineType,
        treeToUse: TransactionTree = new TransactionTree()
    ): StateMachine<SM_ON_LISTENER> {
        let stateMachineCore = StateMachineCoreFactory.create(
            def,
            (thisSm) => Logger$(type, `${def.rootDef.name}`, thisSm, treeToUse)
        );
        let stateMachine = this.createSm(
            stateMachineCore,
            treeToUse,
            SmEventsSerializerFactory.simpleSerializer(),
            type
        );

        return stateMachine;
    }

    private static createForkableSm<SM_ON_LISTENER extends SmListener>(
        coreDef: StateMachineDef<SM_ON_LISTENER, any>,
        forkStateMachine: StateMachine<SmListener>,
        type: StateMachineType,
    ): StateMachineImpl<SM_ON_LISTENER> {
        let stateMachineCore = StateMachineCoreFactory.create(
            coreDef,
            (core, txTree) => Logger$(type, coreDef.rootDef.name, core, txTree)
        );
        let transactionTree: TransactionTree = new TransactionTree();
        return this.createSm(
            stateMachineCore,
            transactionTree,
            SmEventsSerializerFactory.forkSerializer(forkStateMachine),
            type,
            forkStateMachine
        );
    }

    private static createForkSm<SM_ON_LISTENER, SM_IF_LISTENER>(fromName: string, type: StateMachineType.USER_FORK | StateMachineType.FLOW_FORK) {
        return this.createSimpleSm(
            ForkStateMachineBuilder$().withName(`${fromName}[fork]`).build(),
            type,
            new TransactionTree()
        );
    }

    private static createSm<SM_ON_LISTENER extends SmListener>(
        stateMachineCore: StateMachineCore<SM_ON_LISTENER>,
        txTree: TransactionTree,
        smEventsSerializer: SmEventsSerializer,
        type: StateMachineType,
        forkSm?: StateMachine<ForkStateMachineListener>
    ): StateMachineImpl<SM_ON_LISTENER> {
        Logger$(type, stateMachineCore.getName(), stateMachineCore, undefined).log(EventType.INIT, '', [
            [`listeners`, `${stateMachineCore.listeners.listeners.map(it => it.metadata).map(it => {
                return it.name.split(',').map(it => `(${it})`).join(',');
            })}`],
            [`interceptors`, `${stateMachineCore.interceptors.listeners.map(it => it.metadata)}`],
            [`stages`, `${Object.keys(stateMachineCore.stageDefsByKey).join(', ')}`],
        ]);
        return new StateMachineImpl<SM_ON_LISTENER>(
            stateMachineCore,
            txTree,
            theOrchestrator,
            Logger$(type, `${stateMachineCore.name}`, stateMachineCore, txTree),
            smEventsSerializer,
            type,
            forkSm
        );
    }
}
