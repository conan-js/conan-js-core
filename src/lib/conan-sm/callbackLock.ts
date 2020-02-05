import {ICallback, IConsumer} from "../conan-utils/typesHelper";
import {Asap} from "./asap";

export class CallbackLock {
    private locked: boolean = false;
    private currentReactions: ICallback[];
    private currentReactionIndex: number;
    private lastReactionChain: Asap<ICallback[]>;
    private readonly postCallback: CallbackLock;


    constructor(allowPostCallback: boolean) {
        if (allowPostCallback) {
            this.postCallback = new CallbackLock(false);
        }
    }

    requestLock (ifUnlocked: Asap<ICallback[]>, ifLocked: IConsumer<ICallback[]>): void{
        if (this.locked) {
            if (this.currentReactionIndex === this.currentReactions.length -1) {
                // Let it finish with no error, set the next action to do as soon
                // as the lock is released
                this.lastReactionChain = ifUnlocked;
            } else {
                if (!this.postCallback) {
                    ifLocked(this.currentReactions);
                    return;
                }

                this.postCallback.requestLock (Asap.wrapAsNextTick<ICallback[]> (ifUnlocked), ()=>{
                    ifLocked(this.currentReactions);
                });


            }
        } else {
            ifUnlocked.asap(reactions=>{
                this.locked = true;
                this.currentReactions = reactions;
                this.lastReactionChain = null;
                this.currentReactionIndex = -1;

                this.currentReactions.forEach((reaction, i)=>{
                    this.currentReactionIndex = i;
                    reaction();
                });

                this.locked = false;
                this.currentReactions = undefined;
                this.currentReactionIndex = undefined;
                if (this.lastReactionChain) {
                    let chain: Asap<ICallback[]>  = this.lastReactionChain;
                    this.lastReactionChain = undefined;
                    this.requestLock(chain, ()=>{throw new Error('Unexpected error')})
                }
            });
        }
    }
}
