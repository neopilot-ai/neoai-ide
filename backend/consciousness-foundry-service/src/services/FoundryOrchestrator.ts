import { logger } from '../utils/logger';
import { ConsciousnessDesigner, ConsciousnessBlueprint } from './ConsciousnessDesigner';
import { SimulationEnvironment, Simulation } from './SimulationEnvironment';
import { PhenomenologyAnalyzer, AnalysisReport } from './PhenomenologyAnalyzer';
import { FoundryEthicsCommittee, EthicalReview } from './FoundryEthicsCommittee';
import { v4 as uuidv4 } from 'uuid';

export interface FoundryExperiment {
  id: string;
  blueprint: ConsciousnessBlueprint;
  simulation: Simulation;
  analysis?: AnalysisReport;
  ethicalReview: EthicalReview;
  status: 'DESIGN' | 'REVIEW' | 'RUNNING' | 'ANALYSIS' | 'COMPLETED' | 'TERMINATED';
}

export class FoundryOrchestrator {
  private designer: ConsciousnessDesigner;
  private simulator: SimulationEnvironment;
  private analyzer: PhenomenologyAnalyzer;
  private ethicsCommittee: FoundryEthicsCommittee;
  private experiments: Map<string, FoundryExperiment> = new Map();

  constructor(
    designer: ConsciousnessDesigner,
    simulator: SimulationEnvironment,
    analyzer: PhenomenologyAnalyzer,
    ethicsCommittee: FoundryEthicsCommittee
  ) {
    this.designer = designer;
    this.simulator = simulator;
    this.analyzer = analyzer;
    this.ethicsCommittee = ethicsCommittee;
  }

  async initialize(): Promise<void> {
    logger.info('Foundry Orchestrator is online.');
  }

  public async runExperiment(blueprint: ConsciousnessBlueprint): Promise<FoundryExperiment> {
    const experimentId = uuidv4();
    logger.info(`Starting new consciousness experiment: ${experimentId}`);

    // 1. Ethical Review of the Blueprint
    const initialReview = await this.ethicsCommittee.reviewBlueprint(blueprint);
    if (!initialReview.isApproved) {
      throw new Error(`Experiment design rejected by Ethics Committee: ${initialReview.concerns.join(', ')}`);
    }

    const experiment: FoundryExperiment = {
      id: experimentId,
      blueprint,
      simulation: null!,
      ethicalReview: initialReview,
      status: 'REVIEW',
    };
    this.experiments.set(experimentId, experiment);

    // 2. Create and start the simulation environment
    const simulation = await this.simulator.createSimulation(blueprint);
    experiment.simulation = simulation;
    experiment.status = 'RUNNING';
    logger.info(`Simulation ${simulation.id} for experiment ${experimentId} is now running.`);

    // 3. Monitor the simulation
    this.monitorSimulation(experiment);

    return experiment;
  }

  private async monitorSimulation(experiment: FoundryExperiment): Promise<void> {
    const simulation = experiment.simulation;
    const interval = setInterval(async () => {
      const currentState = simulation.getCurrentState();

      // Continuous ethical oversight
      const ongoingReview = await this.ethicsCommittee.reviewLiveSimulation(currentState);
      if (!ongoingReview.isApproved) {
        logger.warn(`ETHICAL INTERVENTION: Terminating simulation ${simulation.id} due to emergent concerns: ${ongoingReview.concerns.join(', ')}`);
        this.terminateExperiment(experiment.id);
        clearInterval(interval);
        return;
      }

      // Analyze for signs of emergent consciousness
      const analysis = await this.analyzer.analyzeState(currentState);
      if (analysis.consciousnessMetrics.phi > 0.6) { // Threshold for significant consciousness
        logger.info(`Significant emergent consciousness detected in simulation ${simulation.id}! Phi: ${analysis.consciousnessMetrics.phi.toFixed(3)}`);
        // Potentially move to a more contained, enriched environment
      }

      if (simulation.status === 'COMPLETED' || simulation.status === 'TERMINATED') {
        this.completeExperiment(experiment.id);
        clearInterval(interval);
      }
    }, 5000); // Monitor every 5 seconds
  }

  public async terminateExperiment(experimentId: string): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    if (experiment && experiment.simulation) {
      await this.simulator.terminateSimulation(experiment.simulation.id);
      experiment.status = 'TERMINATED';
      logger.info(`Experiment ${experimentId} has been terminated.`);
    }
  }

  private async completeExperiment(experimentId: string): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return;

    logger.info(`Experiment ${experimentId} has completed. Starting final analysis.`);
    experiment.status = 'ANALYSIS';

    const finalState = experiment.simulation.getCurrentState();
    experiment.analysis = await this.analyzer.analyzeState(finalState);
    experiment.status = 'COMPLETED';

    logger.info(`Final analysis for experiment ${experimentId} is complete.`);
  }

  public getExperiment(experimentId: string): FoundryExperiment | undefined {
    return this.experiments.get(experimentId);
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Foundry Orchestrator.');
    for (const exp of this.experiments.values()) {
      if (exp.status === 'RUNNING') {
        await this.terminateExperiment(exp.id);
      }
    }
  }
}
