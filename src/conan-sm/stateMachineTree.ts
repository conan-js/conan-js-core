import {IBiConsumer, IBiFunction} from "../conan-utils/typesHelper";
import {StateMachine, SyncStateMachineDef} from "./stateMachine";
import {Objects} from "../conan-utils/objects";
import {StateMachineFactory} from "./stateMachineFactory";
import {ListenerType, OnEventCallback, SmListener} from "./stateMachineListeners";
import {SmController, StateMachineTreeBuilderData} from "./_domain";

export interface Synchronisation {
    syncDef: SyncStateMachineDef<any, any, any>;
    tree: StartSmTree;
}

export interface StartSmTree {
    stateMachineBuilder: StateMachine<any>;
    downSyncs: Synchronisation[];
}


export class StateMachineTree<SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS,
    > {
    start(builder: StateMachine<SM_ON_LISTENER>): SmController<SM_ON_LISTENER, SM_IF_LISTENER> {
        let root: StartSmTree = this.createSyncSmTree(builder);
        this.childrenFirst(root, (data, synchronisation) => this.doSyncListeners(data, synchronisation));
        return this.parentFirst<SmController<SM_ON_LISTENER, SM_IF_LISTENER>>(root, undefined, (startTree, syncDef) => {
            return this.create(startTree.stateMachineBuilder.request, syncDef)
        });
    }

    private doSyncListeners(data: StateMachine<any>, sync: Synchronisation): void {
        this.syncSm(data, sync);
        if (sync.syncDef.initCb) {
            sync.syncDef.initCb(sync.syncDef.stateMachineBuilder);
        }
    }

    create(request: StateMachineTreeBuilderData<any, any>, syncDef: SyncStateMachineDef<any, any, any>): SmController<SM_ON_LISTENER, SM_IF_LISTENER> {
        let finalSMData: StateMachineTreeBuilderData<any, any> = !syncDef ? request : {
            ...request,
            name: syncDef.syncName,
        };

        return StateMachineFactory.create<any, any, any>(finalSMData);
    }

    private childrenFirst(tree: StartSmTree, action: IBiConsumer<StateMachine<any>, Synchronisation>): void {
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

    private createSyncSmTree(stateMachineBuilder: StateMachine<any>): StartSmTree {
        let syncSmTree: StartSmTree = {
            stateMachineBuilder: stateMachineBuilder,
            downSyncs: [],
        };
        stateMachineBuilder.request.syncDefs.forEach(syncDef => {
            syncSmTree.downSyncs.push({
                syncDef: syncDef,
                tree: this.createSyncSmTree(syncDef.stateMachineBuilder)
            })
        });
        return syncSmTree;
    }

    private syncSm<FROM_LISTENER extends SmListener,
        FROM_JOINER extends SmListener,
        FROM_ACTIONS,
        FROM_SM extends SmController<FROM_LISTENER, FROM_JOINER>,
        INTO_LISTENER extends SmListener,
        INTO_SM extends StateMachine<INTO_LISTENER>>(
        into: StateMachine<any>,
        sync: Synchronisation
    ): void {
        let syncListener: INTO_LISTENER = Objects.mapKeys<INTO_LISTENER, FROM_JOINER, OnEventCallback<any>>(
            sync.syncDef.joiner,
            (ifStatements) => (
                () => {
                    into.nextConditionally([`if=>${sync.syncDef.syncName}`, ifStatements]);
                }
            )
        );
        sync.syncDef.stateMachineBuilder.addListener([`${sync.syncDef.syncName}`, syncListener], ListenerType.ALWAYS);
    }


}
