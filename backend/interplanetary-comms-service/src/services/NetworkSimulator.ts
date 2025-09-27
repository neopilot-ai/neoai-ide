import { logger } from '../utils/logger';
import { OrbitalMechanics, CommunicationLink } from './OrbitalMechanics';
import { Bundle } from './DtnRouter';

export interface SimulationParameters {
  bitErrorRate: number; // Probability of a bit flip
  packetLossRate: number; // Probability of a whole packet being lost
  solarFlareActivity: number; // 0 to 1, affects error rates
}

export class NetworkSimulator {
  private orbitalMechanics: OrbitalMechanics;
  private params: SimulationParameters;

  constructor(orbitalMechanics: OrbitalMechanics) {
    this.orbitalMechanics = orbitalMechanics;
    this.params = {
      bitErrorRate: 1e-7, // 1 in 10 million bits
      packetLossRate: 1e-5, // 1 in 100,000 packets
      solarFlareActivity: 0.1,
    };
  }

  async initialize(): Promise<void> {
    logger.info('Interplanetary Network Simulator is online.');
    // Start a loop to dynamically change simulation parameters
    setInterval(() => this.updateSolarActivity(), 60 * 1000); // Update every minute
  }

  public async transmit(link: CommunicationLink, bundle: Bundle): Promise<boolean> {
    return new Promise(resolve => {
      // 1. Simulate Latency
      const delay = link.latency * 1000; // in milliseconds
      logger.debug(`Simulating transmission over ${link.distance.toFixed(0)} km. Latency: ${delay.toFixed(0)} ms.`);

      setTimeout(() => {
        // 2. Simulate Packet Loss
        if (Math.random() < this.params.packetLossRate) {
          logger.warn(`SIMULATED: Packet loss for bundle ${bundle.id} from ${link.source} to ${link.destination}`);
          resolve(false);
          return;
        }

        // 3. Simulate Bit Errors
        const errorRate = this.params.bitErrorRate * (1 + this.params.solarFlareActivity * 10);
        const numErrors = this.simulateBitErrors(bundle.payload, errorRate);
        if (numErrors > 0) {
          logger.warn(`SIMULATED: ${numErrors} bit errors in bundle ${bundle.id}. Relying on error correction.`);
          // Here, a real system would attempt error correction. We assume it succeeds if errors are low.
          if (numErrors > 10) { // Arbitrary threshold for uncorrectable errors
            resolve(false);
            return;
          }
        }

        resolve(true);
      }, delay);
    });
  }

  private simulateBitErrors(payload: Buffer, errorRate: number): number {
    let errors = 0;
    for (let i = 0; i < payload.length; i++) {
      for (let j = 0; j < 8; j++) {
        if (Math.random() < errorRate) {
          payload[i] ^= (1 << j); // Flip a bit
          errors++;
        }
      }
    }
    return errors;
  }

  private updateSolarActivity(): void {
    // Simulate changing space weather conditions
    this.params.solarFlareActivity = Math.random() * 0.5;
    logger.info(`Simulation update: Solar flare activity is now at ${(this.params.solarFlareActivity * 100).toFixed(0)}%`);
  }

  public setParameters(params: Partial<SimulationParameters>): void {
    this.params = { ...this.params, ...params };
    logger.info('Network simulation parameters updated.');
  }
}
