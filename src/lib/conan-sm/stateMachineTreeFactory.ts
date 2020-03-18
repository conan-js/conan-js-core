import {ListenerType, SmListener, SmListenerDefLikeParser, SmListenerDefList} from "./stateMachineListeners";
import {StateMachineTreeDef, SyncStateMachineDef} from "./stateMachineTreeDef";
import {ParentRelationship, StateMachineTree} from "./stateMachineTree";
import {EventType, StateMachineLogger, StateMachineLoggerHelper} from "./stateMachineLogger";
import {StateMachine, ToProcessType} from "./stateMachine";
import {IKeyValuePairs} from "../conan-utils/typesHelper";
import {StageDef} from "./stage";

export interface Synchronisation {
    syncDef: SyncStateMachineDef<any, any, any>;
    tree: StartSmTree;
}

export interface StartSmTree {
    stateMachineTreeDef: StateMachineTreeDef<any, any>;
    downSyncs: Synchronisation[];
}


export class StateMachineTreeFactory {
    static create<
        SM_ON_LISTENER extends SmListener,
        SM_IF_LISTENER extends SmListener,
    >(
        treeDef: StateMachineTreeDef<SM_ON_LISTENER, SM_IF_LISTENER>,
        parentInfo?: ParentRelationship,
    ): StateMachineTree<SM_ON_LISTENER> {
        let stateMachineTree: StateMachineTree<SM_ON_LISTENER>;
        let stateMachine: StateMachine<SM_ON_LISTENER, SM_IF_LISTENER, unknown>;

        let systemStages: IKeyValuePairs<StageDef<string, any, any, any>>;
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
                    onInit: ()=>{
                        stateMachineTree.requestTransition({
                            transitionName: `doStart`,
                            transition: {
                                stateName: 'start'
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

        let logger: StateMachineLogger = {
            log: (eventType: EventType, details?: string, additionalLines?: [string, string][]): void=>{
                StateMachineLoggerHelper.log(
                    treeDef.rootDef.name,
                    stateMachine._status,
                    stateMachine.eventThread.getCurrentStageName(),
                    stateMachine.eventThread.getCurrentTransitionName(),
                    eventType,
                    stateMachineTree.transactionTree.getCurrentTransactionId(),
                    details,
                    additionalLines
                )
            }
        };
        stateMachine = new StateMachine(
            {
                ...treeDef.rootDef,
                listeners: [...treeDef.rootDef.listeners, ...systemListeners],
                stageDefsByKey: {...systemStages, ...treeDef.rootDef.stageDefsByKey},
            }, logger
        );
        stateMachineTree = new StateMachineTree<SM_ON_LISTENER>(
            stateMachine,
            parentInfo
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

        stateMachineTree.requestStage ({
            description: '::init',
            eventType: EventType.INIT,
            stage: {
                stateName: 'init'
            },
            type: ToProcessType.STAGE
        });

        return stateMachineTree;
    }


}
