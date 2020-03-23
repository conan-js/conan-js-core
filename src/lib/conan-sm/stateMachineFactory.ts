import {ListenerType, SmListener, SmListenerDefLikeParser, SmListenerDefList} from "./stateMachineListeners";
import {StateMachineDef, SyncStateMachineDef} from "./stateMachineDef";
import {StateMachine, StateMachineImpl} from "./stateMachine";
import {EventType, StateMachineLogger, StateMachineLoggerHelper} from "./stateMachineLogger";
import {IKeyValuePairs} from "../conan-utils/typesHelper";
import {StateDef} from "./state";
import {TransactionTree} from "../conan-tx/transactionTree";
import {StateMachineCoreImpl, StateMachineStatus} from "./stateMachineCore";
import {StateMachineTx} from "./stateMachineTx";
import {ForkStateMachineBuilder$, ForkStateMachineListener} from "./forkStateMachine";
import {SmOrchestrator} from "./smOrchestrator";
import {ForkSmRequestStrategy, SimpleSmRequestStrategy} from "./smRequestStrategy";
import {ListenersController} from "./listenersController";

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
        let finalStateMachine: StateMachineImpl<SM_ON_LISTENER>;
        let systemStages: IKeyValuePairs<StateDef<string, any, any, any>>;
        systemStages = {
            init: {
                name: 'init',
                logic: undefined
            },
            start: {
                name: 'start',
                logic: undefined
            },
            stop: {
                name: 'stop',
                logic: undefined
            }
        };

        let systemListeners: SmListenerDefList<SM_ON_LISTENER> = [];
        systemListeners.push(
            new SmListenerDefLikeParser().parse([
                '::init=>doStart', {
                    onInit: () => {
                        finalStateMachine.requestTransition({
                            transitionName: `doStart`,
                            into: {
                                name: 'start'
                            }
                        })
                    }
                } as any as SM_ON_LISTENER
            ], ListenerType.ONCE)
        );

        systemListeners.push(
            new SmListenerDefLikeParser().parse(['::stop->shutdown', {
                onStop: () => {
                    // stateMachineTree.root.shutdown();
                }
            } as any as SM_ON_LISTENER], ListenerType.ONCE)
        );

        let transactionTree: TransactionTree = new TransactionTree();
        let stateMachineCore = new StateMachineCoreImpl<any, any, any>(
            treeDef.rootDef.name,
            new ListenersController([...treeDef.rootDef.listeners, ...systemListeners], ()=>logger),
            new ListenersController(treeDef.rootDef.interceptors, ()=>logger),
        {...systemStages, ...treeDef.rootDef.stageDefsByKey}
        );
        let logger: StateMachineLogger = {
            log: (eventType: EventType, details?: string, additionalLines?: [string, string][]): void => {
                StateMachineLoggerHelper.log(
                    treeDef.rootDef.name,
                    StateMachineStatus.IDLE,
                    stateMachineCore.getCurrentStageName(),
                    stateMachineCore.getCurrentTransitionName(),
                    eventType,
                    transactionTree ? transactionTree.getCurrentTransactionId(): '-',
                    details,
                    additionalLines
                )
            }
        };

        let stateMachine: StateMachine<SM_ON_LISTENER>;
        // noinspection JSUnusedAssignment
        let stateMachineTx = new StateMachineTx(logger);
        stateMachine = new StateMachineImpl(
            stateMachineCore,
            (tx)=>transactionTree.createOrQueueTransaction(tx, ()=>null, ()=>null),
            (stateMachineController)=>new SmOrchestrator(stateMachineController, stateMachineCore, logger),
            (stateMachineController)=>new SimpleSmRequestStrategy(stateMachineController, logger),
            stateMachineTx
        );

        let forkDef = ForkStateMachineBuilder$.build().rootDef;
        let forkStateMachineCore: StateMachineCoreImpl<ForkStateMachineListener, any> = new StateMachineCoreImpl(
            forkDef.name,
            new ListenersController(forkDef.listeners, ()=>logger),
            new ListenersController(forkDef.interceptors, ()=>logger),
            forkDef.stageDefsByKey
        );
        let forkStateMachine: StateMachine<ForkStateMachineListener> = new StateMachineImpl(
            forkStateMachineCore,
            (tx)=>transactionTree.createOrQueueTransaction(tx, ()=>null, ()=>null),
            (thisSm)=>new SmOrchestrator(thisSm, forkStateMachineCore, logger),
            (thisSm)=>new SimpleSmRequestStrategy(thisSm, logger),
            stateMachineTx
        );


        logger.log(EventType.INIT,  '', [
            [`listeners`, `${treeDef.rootDef.listeners.map(it=>it.metadata).map(it => {
                return it.name.split(',').map(it=>`(${it})`).join(',');
            })}`],
            [`system listeners`, `${systemListeners.map(it=>it.metadata).map(it => {
                return it.name.split(',').map(it=>`(${it})`).join(',');
            })}`],
            [`interceptors`, `${treeDef.rootDef.interceptors.map(it => it.metadata)}`],
            [`stages`, `${Object.keys(treeDef.rootDef.stageDefsByKey).join(', ')}`],
            [`system stages`, 'init, start, stop'],
        ]);


        finalStateMachine = new StateMachineImpl(
            stateMachine,
            (tx) => transactionTree.createOrQueueTransaction(tx, () => null, () => null),
            (stateMachineController) => new SmOrchestrator(stateMachineController, stateMachineCore, logger),
            (thisSm) => new ForkSmRequestStrategy(
                thisSm,
                forkStateMachine,
                new SimpleSmRequestStrategy(thisSm, logger)
            ),
            stateMachineTx
        );

        forkStateMachine.requestStage({
            name: 'idle'
        });

        finalStateMachine.requestStage ({
            name: 'init'
        });
        return finalStateMachine;
    }

}
