import { logger } from '../utils/logger';
import { QuantumCircuit } from './CircuitGenerator';
import { v4 as uuidv4 } from 'uuid';
import { Server as SocketIOServer } from 'socket.io';
import Bull from 'bull';

// Represents a request to run a circuit on a quantum device
export interface QuantumJob {
  id: string;
  problemId: string;
  circuit: QuantumCircuit;
  shots: number;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  backend: string; // e.g., 'ibm_q_simulator', 'aws_sv1'
  result?: QuantumJobResult;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface QuantumJobResult {
  counts: Record<string, number>; // e.g., { '001': 512, '101': 512 }
  memory: string[];
  executionTime: number;
}

export class QuantumJobManager {
  private io: SocketIOServer;
  private jobQueue: Bull.Queue<QuantumJob>;
  private activeJobs: Map<string, QuantumJob> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.jobQueue = new Bull('quantum-jobs', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });
  }

  async initialize(): Promise<void> {
    logger.info('Quantum Job Manager is online.');
    this.processJobs();
  }

  public async submitJob(jobData: Omit<QuantumJob, 'id' | 'status' | 'backend' | 'createdAt'>): Promise<QuantumJob> {
    const job: QuantumJob = {
      ...jobData,
      id: uuidv4(),
      status: 'QUEUED',
      backend: this.selectBackend(jobData.circuit),
      createdAt: new Date(),
    };

    await this.jobQueue.add(job);
    this.activeJobs.set(job.id, job);
    this.emitJobStatus(job);

    logger.info(`Quantum job ${job.id} has been queued for backend ${job.backend}.`);
    return job;
  }

  private processJobs(): void {
    this.jobQueue.process(async (bullJob) => {
      const job: QuantumJob = bullJob.data;
      logger.info(`Processing quantum job ${job.id}...`);

      job.status = 'RUNNING';
      this.emitJobStatus(job);

      try {
        // This is where the job would be sent to a real quantum provider's API.
        // We will simulate the execution.
        const result = await this.simulateExecution(job);
        job.result = result;
        job.status = 'COMPLETED';
        job.completedAt = new Date();
      } catch (error) {
        job.status = 'FAILED';
        job.error = error.message;
      }

      this.activeJobs.set(job.id, job);
      this.emitJobStatus(job);
      logger.info(`Quantum job ${job.id} finished with status ${job.status}.`);
    });
  }

  private async simulateExecution(job: QuantumJob): Promise<QuantumJobResult> {
    return new Promise(resolve => {
      // Simulate execution time based on qubits and gates
      const executionTime = job.circuit.qubits * 10 + job.circuit.gates.length * 2;
      setTimeout(() => {
        // Simulate a probabilistic result. For a simple circuit, we might get a superposition.
        const counts: Record<string, number> = {};
        for (let i = 0; i < job.shots; i++) {
          let outcome = '';
          for (let j = 0; j < job.circuit.bits; j++) {
            outcome += Math.random() > 0.5 ? '1' : '0';
          }
          counts[outcome] = (counts[outcome] || 0) + 1;
        }
        resolve({ counts, memory: [], executionTime });
      }, executionTime);
    });
  }

  public async waitForJob(jobId: string): Promise<QuantumJob> {
    const bullJob = await this.jobQueue.getJob(jobId);
    if (bullJob) {
      await bullJob.finished();
    }
    return this.activeJobs.get(jobId)!;
  }

  private selectBackend(circuit: QuantumCircuit): string {
    // Simple logic to select a backend. A real system would be much more complex,
    // considering qubit count, connectivity, error rates, and cost.
    if (circuit.qubits > 20) {
      return 'aws_sv1_simulator'; // A powerful simulator for large circuits
    } else {
      return 'ibm_q_armonk'; // A real 1-qubit device for small tests
    }
  }

  private emitJobStatus(job: QuantumJob): void {
    this.io.to(job.id).emit('job_status_update', {
      jobId: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
    });
  }
}
