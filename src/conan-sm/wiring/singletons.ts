import {SmOrchestrator} from "./smOrchestrator";
import {SmTransactions} from "./smTransactions";
import {ForkService} from "../services/forkService";

export let theForkService = new ForkService();
export let theOrchestrator = new SmOrchestrator();
export let theTransactions = new SmTransactions();
theTransactions.orchestrator = theOrchestrator;
theOrchestrator.stateMachineTx = theTransactions;

theOrchestrator.forkService = theForkService;
theForkService.orchestrator = theOrchestrator;
