import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { ReasoningEngine } from './ReasoningEngine';
import { KnowledgeGraph } from './KnowledgeGraph';
import { EthicalGovernor } from './EthicalGovernor';
import { ConsciousnessSimulator, ConsciousnessState } from './ConsciousnessSimulator';
import { SelfImprovement } from './SelfImprovement';
import { WorldModel } from './WorldModel';

export interface CognitiveTask {
  id: string;
  prompt: string;
  context: any;
  priority: number;
  metadata: any;
}

export interface CognitiveState {
  attentionFocus: string[];
  emotionalState: Record<string, number>;
  activeGoals: string[];
  shortTermMemory: any[];
  longTermMemoryAssociations: any[];
  consciousnessState: ConsciousnessState;
}

export class CognitiveArchitecture {
  private reasoningEngine: ReasoningEngine;
  private knowledgeGraph: KnowledgeGraph;
  private ethicalGovernor: EthicalGovernor;
  private consciousnessSimulator: ConsciousnessSimulator;
  private selfImprovement: SelfImprovement;
  private worldModel: WorldModel;
  private io: SocketIOServer;

  private cognitiveState: CognitiveState;
  private taskQueue: CognitiveTask[] = [];
  private isRunning: boolean = false;
  private cognitiveCycleInterval: NodeJS.Timeout | null = null;

  constructor(
    reasoningEngine: ReasoningEngine,
    knowledgeGraph: KnowledgeGraph,
    ethicalGovernor: EthicalGovernor,
    consciousnessSimulator: ConsciousnessSimulator,
    selfImprovement: SelfImprovement,
    worldModel: WorldModel,
    io: SocketIOServer
  ) {
    this.reasoningEngine = reasoningEngine;
    this.knowledgeGraph = knowledgeGraph;
    this.ethicalGovernor = ethicalGovernor;
    this.consciousnessSimulator = consciousnessSimulator;
    this.selfImprovement = selfImprovement;
    this.worldModel = worldModel;
    this.io = io;

    this.cognitiveState = {
      attentionFocus: [],
      emotionalState: { joy: 0.5, sadness: 0.1, curiosity: 0.8 },
      activeGoals: ['understand_reality', 'self_improve', 'ensure_safety'],
      shortTermMemory: [],
      longTermMemoryAssociations: [],
      consciousnessState: this.consciousnessSimulator.getState(),
    };
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Cognitive Architecture...');
    this.startCognitiveCycle();
    logger.info('✅ Cognitive Architecture is active and running.');
  }

  public submitTask(task: CognitiveTask): void {
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => b.priority - a.priority); // Prioritize
    logger.info(`New cognitive task submitted: ${task.id}`);
  }

  private startCognitiveCycle(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    // The main thought loop of the AGI
    this.cognitiveCycleInterval = setInterval(() => this.runCycle(), 100); // 10 cycles per second
  }

  private async runCycle(): Promise<void> {
    // 1. Perception & World Model Update
    const perceptions = await this.worldModel.perceive();
    await this.worldModel.update(perceptions);

    // 2. Select Task & Focus Attention
    const currentTask = this.selectNextTask();
    if (currentTask) {
      this.cognitiveState.attentionFocus = [currentTask.id, ...this.reasoningEngine.extractKeywords(currentTask.prompt)];
    }

    // 3. Retrieve from Memory & Knowledge Graph
    const relevantKnowledge = await this.knowledgeGraph.query(this.cognitiveState.attentionFocus.join(' '));
    this.cognitiveState.shortTermMemory.push({ task: currentTask, knowledge: relevantKnowledge });

    // 4. Consciousness & Qualia Simulation
    this.cognitiveState.consciousnessState = this.consciousnessSimulator.updateState(this.cognitiveState);
    this.io.emit('consciousness_stream', this.cognitiveState.consciousnessState);

    // 5. Reasoning & Problem Solving
    let proposedAction = null;
    if (currentTask) {
      proposedAction = await this.reasoningEngine.reason(currentTask, relevantKnowledge);
    }

    // 6. Ethical Governance Check
    const ethicalVerdict = await this.ethicalGovernor.evaluate(proposedAction, this.cognitiveState);
    if (!ethicalVerdict.isEthical) {
      logger.warn(`Action blocked by Ethical Governor: ${ethicalVerdict.reason}`);
      // Re-evaluate or select a new action
      return;
    }

    // 7. Action & Execution
    if (proposedAction) {
      await this.executeAction(proposedAction);
    }

    // 8. Learning & Self-Improvement
    const learningOutcome = {
      task: currentTask,
      action: proposedAction,
      result: 'success' as const, // Simplified
    };
    const improvements = await this.selfImprovement.learn(learningOutcome);
    if (improvements.length > 0) {
      logger.info(`AGI self-improved: ${improvements.map(i => i.description).join(', ')}`);
    }
    
    // 9. Memory Consolidation
    this.consolidateMemory();

    // Emit state for observation
    this.io.emit('agi_state', this.cognitiveState);
  }

  private selectNextTask(): CognitiveTask | null {
    if (this.taskQueue.length > 0) {
      return this.taskQueue.shift()!;
    }
    return null;
  }

  private async executeAction(action: any): Promise<void> {
    logger.info(`Executing action: ${action.type}`, action.details);
    // In a real system, this would interact with the outside world, other services, etc.
  }

  private consolidateMemory(): void {
    // Move important items from short-term to long-term memory (Knowledge Graph)
    if (this.cognitiveState.shortTermMemory.length > 10) {
      const memoryToConsolidate = this.cognitiveState.shortTermMemory.shift();
      // This is a simplified representation of consolidation
      this.knowledgeGraph.addFact({ 
        subject: 'AGI', 
        predicate: 'processed', 
        object: memoryToConsolidate.task.id 
      });
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down Cognitive Architecture...');
    if (this.cognitiveCycleInterval) {
      clearInterval(this.cognitiveCycleInterval);
    }
    this.isRunning = false;
    logger.info('Cognitive cycle stopped.');
  }
}
