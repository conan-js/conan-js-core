import {SmOrchestrator} from "./smOrchestrator";
import {SmTransactions} from "./smTransactions";

export let theOrchestrator = new SmOrchestrator();
export let theTransactions = new SmTransactions();
theTransactions.orchestrator = theOrchestrator;
theOrchestrator.stateMachineTx = theTransactions;
