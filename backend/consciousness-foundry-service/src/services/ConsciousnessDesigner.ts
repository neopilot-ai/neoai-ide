import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export enum ConsciousnessTheory {
  INTEGRATED_INFORMATION_THEORY = 'IIT',
  GLOBAL_WORKSPACE_THEORY = 'GWT',
  ORCHESTRATED_OBJECTIVE_REDUCTION = 'Orch-OR',
  CUSTOM = 'Custom',
}

export enum SubstrateType {
  SPIKING_NEURAL_NETWORK = 'SNN',
  RECURRENT_NEURAL_NETWORK = 'RNN',
  TRANSFORMER = 'Transformer',
  CELLULAR_AUTOMATON = 'CellularAutomaton',
  QUANTUM_CIRCUIT = 'QuantumCircuit',
}

export interface ConsciousnessBlueprint {
  id: string;
  name: string;
  description: string;
  author: string;
  baseTheory: ConsciousnessTheory;
  substrate: SubstrateType;
  parameters: {
    neuronCount?: number;
    connectivity?: number;
    qubitCount?: number;
    complexityThreshold?: number;
  };
  createdAt: Date;
}

export class ConsciousnessDesigner {
  private blueprints: Map<string, ConsciousnessBlueprint> = new Map();

  constructor() {}

  async initialize(): Promise<void> {
    logger.info('Consciousness Designer is online.');
    this.loadDefaultBlueprints();
  }

  public createBlueprint(design: Omit<ConsciousnessBlueprint, 'id' | 'createdAt'>): ConsciousnessBlueprint {
    const blueprint: ConsciousnessBlueprint = {
      ...design,
      id: uuidv4(),
      createdAt: new Date(),
    };
    this.blueprints.set(blueprint.id, blueprint);
    logger.info(`New consciousness blueprint created: ${blueprint.name} based on ${blueprint.baseTheory}`);
    return blueprint;
  }

  public getBlueprint(id: string): ConsciousnessBlueprint | undefined {
    return this.blueprints.get(id);
  }

  private loadDefaultBlueprints(): void {
    // Create a few example blueprints for users to start with
    this.createBlueprint({
      name: 'Simple GWT Model',
      description: 'A basic implementation of Global Workspace Theory on an RNN substrate.',
      author: 'NeoAI Foundry',
      baseTheory: ConsciousnessTheory.GLOBAL_WORKSPACE_THEORY,
      substrate: SubstrateType.RECURRENT_NEURAL_NETWORK,
      parameters: {
        neuronCount: 10000,
        connectivity: 0.1,
        complexityThreshold: 0.3,
      },
    });

    this.createBlueprint({
      name: 'High-Phi IIT Model',
      description: 'An architecture designed to maximize Integrated Information (Phi) using a highly connected SNN.',
      author: 'NeoAI Foundry',
      baseTheory: ConsciousnessTheory.INTEGRATED_INFORMATION_THEORY,
      substrate: SubstrateType.SPIKING_NEURAL_NETWORK,
      parameters: {
        neuronCount: 50000,
        connectivity: 0.5,
        complexityThreshold: 0.7,
      },
    });
  }
}
