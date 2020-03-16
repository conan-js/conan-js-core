import {IBiConsumer, IBiFunction} from "../conan-utils/typesHelper";
import {StateMachineTreeDefBuilder, SyncStateMachineDef} from "./stateMachineTreeDefBuilder";
import {StateMachineFactory} from "./stateMachineFactory";
import {SmListener} from "./stateMachineListeners";
import {StateMachine, StateMachineTreeDef} from "./_domain";

export interface Synchronisation {
    syncDef: SyncStateMachineDef<any, any, any>;
    tree: StartSmTree;
}

export interface StartSmTree {
    stateMachineTreeDef: StateMachineTreeDef<any, any>;
    downSyncs: Synchronisation[];
}


export class StateMachineTreeStarter<
    SM_ON_LISTENER extends SmListener,
    SM_IF_LISTENER extends SmListener,
    ACTIONS,
> {
    start(def: StateMachineTreeDef<SM_ON_LISTENER, SM_IF_LISTENER>): StateMachine<SM_ON_LISTENER, SM_IF_LISTENER> {
        let root: StartSmTree = this.createSyncSmTree(def);
        this.childrenFirst(root, (data, synchronisation) => this.doSyncListeners(synchronisation));
        return this.parentFirst<StateMachine<SM_ON_LISTENER, SM_IF_LISTENER>>(root, undefined, (startTree, syncDef) => {
            return this.create(startTree.stateMachineTreeDef, syncDef)
        });
    }

    private doSyncListeners(sync: Synchronisation): void {
        this.syncSm(sync);
        if (sync.syncDef.initCb) {
            sync.syncDef.initCb(sync.syncDef.stateMachineTreeDef);
        }
    }

    create(request: StateMachineTreeDef<any, any>, syncDef: SyncStateMachineDef<any, any, any>): StateMachine<SM_ON_LISTENER, SM_IF_LISTENER> {
        let finalSMData: StateMachineTreeDef<any, any> = !syncDef ? request : {
            ...request,
            name: syncDef.syncName,
        };

        return StateMachineFactory.create<any, any, any>(finalSMData);
    }

    private childrenFirst(tree: StartSmTree, action: IBiConsumer<StateMachineTreeDef<any, any>, Synchronisation>): void {
        tree.downSyncs.forEach(sync => {
            this.childrenFirst(sync.tree, action);
            action(tree.stateMachineTreeDef, sync);
        });
    }

    private parentFirst<T>(syncSmTree: StartSmTree, syncDef: SyncStateMachineDef<any, any, any>, action: IBiFunction<StartSmTree, SyncStateMachineDef<any, any, any>, T>): T {
        let result: T = action(syncSmTree, syncDef);
        syncSmTree.downSyncs.forEach(sync => {
            this.parentFirst(sync.tree, sync.syncDef, action);
        });
        return result;
    }

    private createSyncSmTree(stateMachineTreeDef: StateMachineTreeDef<SM_ON_LISTENER, SM_IF_LISTENER>): StartSmTree {
        let syncSmTree: StartSmTree = {
            stateMachineTreeDef: stateMachineTreeDef,
            downSyncs: [],
        };
        stateMachineTreeDef.syncDefs.forEach(syncDef => {
            syncSmTree.downSyncs.push({
                syncDef: syncDef,
                tree: this.createSyncSmTree(syncDef.stateMachineTreeDef)
            })
        });
        return syncSmTree;
    }

    private syncSm<
        FROM_LISTENER extends SmListener,
        FROM_JOINER extends SmListener,
        FROM_ACTIONS,
        FROM_SM extends StateMachine<FROM_LISTENER, FROM_JOINER>,
        INTO_LISTENER extends SmListener,
        INTO_SM extends StateMachineTreeDefBuilder<INTO_LISTENER>
    >(
        sync: Synchronisation
    ): void {
        throw new Error('TBI');
    }


}
