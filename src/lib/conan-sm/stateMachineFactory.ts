import {BaseActions, ListenerType, SmListener} from "./stateMachineListeners";
import {StateMachineDef, SyncStateMachineDef} from "./stateMachineDef";
import {StateMachine, StateMachineImpl} from "./stateMachine";
import {EventType, Logger$} from "./stateMachineLogger";
import {TransactionTree} from "../conan-tx/transactionTree";
import {StateMachineTx} from "./stateMachineTx";
import {ForkStateMachineBuilder$} from "./forkStateMachine";
import {SmOrchestrator} from "./smOrchestrator";
import {ForkSmRequestStrategy, SimpleSmRequestStrategy, SmRequestStrategy} from "./smRequestStrategy";
import {StateMachineCoreFactory} from "./core/stateMachineCoreFactory";
import {StateMachineCoreDefBuilder} from "./core/stateMachineCoreDefBuilder";
import {StateMachineCoreDef} from "./core/stateMachineCoreDef";
import {StateMachineCore} from "./core/stateMachineCore";

export interface Synchronisation {
    syncDef: SyncStateMachineDef<any, any, any>;
    tree: StartSmTree;
}

export interface StartSmTree {
    stateMachineTreeDef: StateMachineDef<any, any>;
    downSyncs: Synchronisation[];
}


export class StateMachineFactory {
    static create<
        SM_ON_LISTENER extends SmListener,
        SM_IF_LISTENER extends SmListener,
    >(
        treeDef: StateMachineDef<SM_ON_LISTENER, SM_IF_LISTENER>,
    ): StateMachine<SM_ON_LISTENER> {
        let forkTree: TransactionTree = new TransactionTree();

        let forkStateMachine = this.createSimpleSm(
            ForkStateMachineBuilder$().withName(`${treeDef.rootDef.name}[fork]`).build(),
            forkTree
        );

        let finalStateMachine: StateMachine<SM_ON_LISTENER> = this.createForkSm(treeDef.rootDef, forkStateMachine, forkTree);


        forkStateMachine.requestStage({
            name: 'idle'
        });

        finalStateMachine.requestStage({
            name: 'init'
        });

        return finalStateMachine;
    }

    private static createForkSm<SM_ON_LISTENER extends SmListener>(
        coreDef: StateMachineCoreDef<SM_ON_LISTENER>,
        forkStateMachine: StateMachine<SmListener>,
        forkTree: TransactionTree
    ): StateMachine<SM_ON_LISTENER> {
        let stateMachineCore = StateMachineCoreFactory.create(
            this.createBaseCore(coreDef),
            (core, txTree) => Logger$(this.createBaseCore(coreDef).name, core, txTree)
        );
        let transactionTree: TransactionTree = new TransactionTree();
        let stateMachineImpl = this.createSm(stateMachineCore, transactionTree, new ForkSmRequestStrategy(
            forkStateMachine,
            new SimpleSmRequestStrategy(),
            forkTree
        ));
        Logger$(coreDef.name, stateMachineImpl, transactionTree).log(EventType.INIT, '', [
            [`listeners`, `${coreDef.listeners.map(it => it.metadata).map(it => {
                return it.name.split(',').map(it => `(${it})`).join(',');
            })}`],
            [`system listeners`, `${['::init=>doStart'].map(it => {
                return it.split(',').map(it => `(${it})`).join(',');
            })}`],
            [`interceptors`, `${coreDef.interceptors.map(it => it.metadata)}`],
            [`stages`, `${Object.keys(coreDef.stageDefsByKey).join(', ')}`],
            [`system stages`, 'init, start, stop'],
        ]);
        return stateMachineImpl;
    }

    private static createSimpleSm<SM_ON_LISTENER extends SmListener>(
        def: StateMachineCoreDef<SM_ON_LISTENER>,
        treeToUse: TransactionTree = new TransactionTree()
    ): StateMachine<SM_ON_LISTENER> {
        let stateMachineCore = StateMachineCoreFactory.create(
            def,
            (thisSm) => Logger$(`${def.name}`, thisSm, treeToUse)
        );
        return this.createSm(stateMachineCore, treeToUse, new SimpleSmRequestStrategy());
    }

    private static createSm<SM_ON_LISTENER extends SmListener>(
        stateMachineCore: StateMachineCore<SM_ON_LISTENER>,
        treeToUse: TransactionTree,
        requestStrategy: SmRequestStrategy
    ) {
        return new StateMachineImpl(
            stateMachineCore,
            treeToUse,
            new SmOrchestrator(),
            requestStrategy,
            new StateMachineTx(),
            Logger$(`${stateMachineCore.name}`, stateMachineCore, treeToUse)
        );
    }

    private static createBaseCore<SM_ON_LISTENER extends SmListener>(
        baseDef: StateMachineCoreDef<SM_ON_LISTENER>
    ): StateMachineCoreDef<SM_ON_LISTENER> {
        return new StateMachineCoreDefBuilder(baseDef)
            .addListener([
                '::init=>doStart', {
                    onInit: (actions: BaseActions) => {
                        actions.requestTransition({
                            transitionName: `doStart`,
                            into: {
                                name: 'start'
                            }
                        })
                    }
                } as any as SM_ON_LISTENER
            ], ListenerType.ONCE)
            .withState<void>(
                'init',
                undefined
            )
            .withState<void>(
                'start',
                undefined
            )
            .withState<void>(
                'stop',
                undefined
            )
            .build()
    }
}
