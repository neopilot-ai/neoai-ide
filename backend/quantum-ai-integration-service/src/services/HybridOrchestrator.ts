import { logger } from '../utils/logger';
import { ProblemDecomposer, DecomposedProblem } from './ProblemDecomposer';
import { CircuitGenerator, QuantumCircuit } from './CircuitGenerator';
import { QuantumJobManager, QuantumJob } from './QuantumJobManager';
import { ResultInterpreter, ClassicalResult } from './ResultInterpreter';
import { v4 as uuidv4 } from 'uuid';

export interface HybridProblem {
  id: string;
  description: string;
  data: any;
  metadata: {
    source: 'AGI_CORE' | 'USER_DIRECT';
    agiTaskId?: string;
  };
}

export interface HybridSolution {
  problemId: string;
  classicalSolution: any;
  quantumSolution?: ClassicalResult;
  isQuantumAdvantage: boolean;
  executionTime: number;
}

export class HybridOrchestrator {
  private problemDecomposer: ProblemDecomposer;
  private circuitGenerator: CircuitGenerator;
  private quantumJobManager: QuantumJobManager;
  private resultInterpreter: ResultInterpreter;

  constructor(
    problemDecomposer: ProblemDecomposer,
    circuitGenerator: CircuitGenerator,
    quantumJobManager: QuantumJobManager,
    resultInterpreter: ResultInterpreter
  ) {
    this.problemDecomposer = problemDecomposer;
    this.circuitGenerator = circuitGenerator;
    this.quantumJobManager = quantumJobManager;
    this.resultInterpreter = resultInterpreter;
  }

  async initialize(): Promise<void> {
    logger.info('Hybrid Orchestrator is online.');
  }

  public async solveProblem(problem: Omit<HybridProblem, 'id'>): Promise<HybridSolution> {
    const hybridProblem: HybridProblem = { ...problem, id: uuidv4() };
    const startTime = Date.now();
    logger.info(`Received hybrid problem ${hybridProblem.id}: ${hybridProblem.description}`);

    // 1. Decompose the problem into classical and quantum components
    const decomposedProblem = await this.problemDecomposer.decompose(hybridProblem);
    if (!decomposedProblem.quantumPart) {
      logger.info('Problem is purely classical. No quantum computation needed.');
      // Solve classically (placeholder)
      const classicalSolution = { solution: 'solved_classically' };
      return {
        problemId: hybridProblem.id,
        classicalSolution,
        isQuantumAdvantage: false,
        executionTime: Date.now() - startTime,
      };
    }

    logger.info(`Problem ${hybridProblem.id} decomposed. Quantum part identified: ${decomposedProblem.quantumPart.type}`);

    // 2. Generate a quantum circuit from the quantum component
    const quantumCircuit = await this.circuitGenerator.generate(decomposedProblem.quantumPart);
    logger.info(`Quantum circuit generated for problem ${hybridProblem.id} with ${quantumCircuit.qubits} qubits.`);

    // 3. Submit the circuit for execution as a quantum job
    const quantumJob = await this.quantumJobManager.submitJob({
      circuit: quantumCircuit,
      shots: 1024, // Default shots
      problemId: hybridProblem.id,
    });
    logger.info(`Quantum job ${quantumJob.id} submitted to hardware/simulator.`);

    // 4. Wait for the quantum job to complete
    const jobResult = await this.quantumJobManager.waitForJob(quantumJob.id);
    if (jobResult.status === 'FAILED') {
      throw new Error(`Quantum job ${quantumJob.id} failed: ${jobResult.error}`);
    }
    logger.info(`Quantum job ${quantumJob.id} completed successfully.`);

    // 5. Interpret the probabilistic quantum results into a classical answer
    const classicalResult = await this.resultInterpreter.interpret(jobResult);
    logger.info(`Quantum results interpreted into classical solution for problem ${hybridProblem.id}.`);

    // 6. Combine classical and quantum results (placeholder)
    const finalSolution = {
      classicalPart: { solution: 'solved_classically' },
      quantumPart: classicalResult,
    };

    return {
      problemId: hybridProblem.id,
      classicalSolution: finalSolution,
      quantumSolution: classicalResult,
      isQuantumAdvantage: true, // Placeholder
      executionTime: Date.now() - startTime,
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Hybrid Orchestrator.');
  }
}
