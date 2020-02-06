import {IBiConsumer, IBiFunction, IConsumer, WithMetadata} from "../conan-utils/typesHelper";
import {EventListener, SerializedSmEvent, SmListener} from "./domain";
import {StateMachineBuilder, SyncStateMachineDef} from "./stateMachineBuilder";
import {SMJoinerDef, SMListenerDef, StateMachineListenerDefs} from "./stateMachineListenerDefs";
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
    stateMachineBuilder: StateMachineBuilder<any, any, any>;
    downSyncs: Synchronisation[];
}

export interface StateMachineStartRequest
<
    SM_LISTENER extends SmListener,
    JOIN_LISTENER extends SmListener,
> {
    name: string,
    startingPath: string,
    syncStateMachineDefs: SyncStateMachineDef<JOIN_LISTENER, any, any> [],
    stateMachineListenerDefs: StateMachineListenerDefs<SM_LISTENER, JOIN_LISTENER, StateMachine<SM_LISTENER, JOIN_LISTENER>>
    stageDefs: StageDef<string, any, any, any> []
    nextReactionsQueue: Queue<WithMetadata<SMListenerDef<SM_LISTENER, StateMachine<SM_LISTENER, JOIN_LISTENER>>, string>>
    nextConditionalReactionsQueue: Queue<WithMetadata<SMJoinerDef<JOIN_LISTENER, StateMachine<SM_LISTENER, JOIN_LISTENER>>, string>>
    nextStagesQueue: Queue<Stage<string, any, any>>
}



export interface StateMachineData<
    SM_LISTENER extends SmListener,
    JOIN_LISTENER extends SmListener,
    ACTIONS,
    INITIAL_ACTIONS = ACTIONS,
> {
    request: StateMachineStartRequest<SM_LISTENER, JOIN_LISTENER>;
}

export class StateMachineStarter<SM_LISTENER extends SmListener,
    JOIN_LISTENER extends SmListener,
    ACTIONS,
    > {
    start(builder: StateMachineBuilder<SM_LISTENER, JOIN_LISTENER, ACTIONS>): StateMachine<SM_LISTENER, JOIN_LISTENER> {
        let root: StartSmTree = this.createSyncSmTree(builder);
        this.childrenFirst(root, (data, synchronisation) => this.doSyncListeners(data, synchronisation));
        return this.parentFirst<StateMachine<SM_LISTENER, JOIN_LISTENER>>(root, undefined, (startTree, syncDef) => {
            return this.create(startTree.stateMachineBuilder.data, syncDef)
        });
    }

    private doSyncListeners(data: StateMachineBuilder<any, any, any>, sync: Synchronisation): void {
        this.syncSm(data, sync);
        if (sync.syncDef.initCb) {
            sync.syncDef.initCb(sync.syncDef.stateMachineBuilder);
        }
    }

    private createSyncSmTree(stateMachineBuilder: StateMachineBuilder<any, any, any>): StartSmTree {
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

    private childrenFirst(tree: StartSmTree, action: IBiConsumer<StateMachineBuilder<any, any, any>, Synchronisation>): void {
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
        INTO_SM extends StateMachineBuilder<INTO_LISTENER, any, any>>(
        into: StateMachineBuilder<any, any, any>,
        sync: Synchronisation
    ): void {
        let syncListener: INTO_LISTENER = Objects.mapKeys<INTO_LISTENER, FROM_JOINER, EventListener<FROM_ACTIONS, any, any>>(
            sync.syncDef.joiner,
            (ifStatements) => ({
                then: () => {
                    into.conditionallyOnce(`if=>${sync.syncDef.syncName}`, ifStatements);
                }
            })
        );
        sync.syncDef.stateMachineBuilder.always(`${sync.syncDef.syncName}`, syncListener);
    }

    create(stateMachineData: StateMachineData<any, any, any>, syncDef: SyncStateMachineDef<any, any, any>): StateMachine<SM_LISTENER, JOIN_LISTENER> {
        let finalSMData: StateMachineData<any, any, any> = !syncDef ? stateMachineData : {
            ...stateMachineData,
            request: {
                ...stateMachineData.request,
                name: syncDef.syncName,
                startingPath: syncDef.syncStartingPath
            }
        };

        return StateMachineFactory.create<any, any, any>(finalSMData);
    }


}
