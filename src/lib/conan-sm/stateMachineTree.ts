import {IBiConsumer, IBiFunction} from "../conan-utils/typesHelper";
import {SmEventCallback, SmListener, SmListenerDef, SmListenerDefList} from "./domain";
import {StateMachineTreeBuilder, SyncStateMachineDef} from "./stateMachineTreeBuilder";
import {StateMachine} from "./stateMachine";
import {Objects} from "../conan-utils/objects";
import {Queue} from "./queue";
import {StateMachineFactory} from "./stateMachineFactory";
import {Stage, StageDef} from "./stage";

export interface Synchronisation {
    syncDef: SyncStateMachineDef<any, any, any>;
    tree: StartSmTree;
}

export interface StartSmTree {
    stateMachineBuilder: StateMachineTreeBuilder<any, any, any>;
    downSyncs: Synchronisation[];
}

export interface StateMachineStartRequest
<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
> {
    name: string,
    syncStateMachineDefs: SyncStateMachineDef<SM_IF_LISTENER, any, any> [],
    stateMachineListeners: SmListenerDefList<SM_ON_LISTENER>
    stageDefs: StageDef<string, any, any, any> []
    nextReactionsQueue: Queue<SmListenerDef<SM_ON_LISTENER>>
    nextConditionalReactionsQueue: Queue<SmListenerDef<SM_IF_LISTENER>>
    nextStagesQueue: Queue<Stage<string, any, any>>
}



export interface StateMachineData<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
> {
    request: StateMachineStartRequest<SM_ON_LISTENER, SM_IF_LISTENER>;
}

export class StateMachineTree<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS,
> {
    start(builder: StateMachineTreeBuilder<SM_ON_LISTENER, SM_IF_LISTENER, ACTIONS>): StateMachine<SM_ON_LISTENER, SM_IF_LISTENER> {
        let root: StartSmTree = this.createSyncSmTree(builder);
        this.childrenFirst(root, (data, synchronisation) => this.doSyncListeners(data, synchronisation));
        return this.parentFirst<StateMachine<SM_ON_LISTENER, SM_IF_LISTENER>>(root, undefined, (startTree, syncDef) => {
            return this.create(startTree.stateMachineBuilder.data, syncDef)
        });
    }

    private doSyncListeners(data: StateMachineTreeBuilder<any, any, any>, sync: Synchronisation): void {
        this.syncSm(data, sync);
        if (sync.syncDef.initCb) {
            sync.syncDef.initCb(sync.syncDef.stateMachineBuilder);
        }
    }

    private createSyncSmTree(stateMachineBuilder: StateMachineTreeBuilder<any, any, any>): StartSmTree {
        let syncSmTree: StartSmTree = {
            stateMachineBuilder: stateMachineBuilder,
            downSyncs: [],
        };
        stateMachineBuilder.data.request.syncStateMachineDefs.forEach(syncDef => {
            syncSmTree.downSyncs.push({
                syncDef: syncDef,
                tree: this.createSyncSmTree(syncDef.stateMachineBuilder)
            })
        });
        return syncSmTree;
    }

    private childrenFirst(tree: StartSmTree, action: IBiConsumer<StateMachineTreeBuilder<any, any, any>, Synchronisation>): void {
        tree.downSyncs.forEach(sync => {
            this.childrenFirst(sync.tree, action);
            action(tree.stateMachineBuilder, sync);
        });
    }

    private parentFirst<T>(syncSmTree: StartSmTree, syncDef: SyncStateMachineDef<any, any, any>, action: IBiFunction<StartSmTree, SyncStateMachineDef<any, any, any>, T>): T {
        let result: T = action(syncSmTree, syncDef);
        syncSmTree.downSyncs.forEach(sync => {
            this.parentFirst(sync.tree, sync.syncDef, action);
        });
        return result;
    }

    private syncSm<FROM_LISTENER extends SmListener,
        FROM_JOINER extends SmListener,
        FROM_ACTIONS,
        FROM_SM extends StateMachine<FROM_LISTENER, FROM_JOINER>,
        INTO_LISTENER extends SmListener,
        INTO_SM extends StateMachineTreeBuilder<INTO_LISTENER, any, any>>(
        into: StateMachineTreeBuilder<any, any, any>,
        sync: Synchronisation
    ): void {
        let syncListener: INTO_LISTENER = Objects.mapKeys<INTO_LISTENER, FROM_JOINER, SmEventCallback<any>>(
            sync.syncDef.joiner,
            (ifStatements) => (
                () => {
                    into.conditionallyOnce(`if=>${sync.syncDef.syncName}`, ifStatements);
                }
            )
        );
        sync.syncDef.stateMachineBuilder.always(`${sync.syncDef.syncName}`, syncListener);
    }

    create(stateMachineData: StateMachineData<any, any>, syncDef: SyncStateMachineDef<any, any, any>): StateMachine<SM_ON_LISTENER, SM_IF_LISTENER> {
        let finalSMData: StateMachineData<any, any> = !syncDef ? stateMachineData : {
            ...stateMachineData,
            request: {
                ...stateMachineData.request,
                name: syncDef.syncName,
            }
        };

        return StateMachineFactory.create<any, any, any>(finalSMData);
    }


}
