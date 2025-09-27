import { logger } from '../utils/logger';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { NeuralSignalProcessor, NeuralData } from './NeuralSignalProcessor';
import { IntentDecoder, DecodedIntent } from './IntentDecoder';
import { ResponseEncoder } from './ResponseEncoder';
import { BioethicsGovernor } from './BioethicsGovernor';
import axios from 'axios';

const AGI_CORE_API = process.env.AGI_CORE_API || 'http://localhost:8020/agi';

export class NeuralInterfaceManager {
  private signalProcessor: NeuralSignalProcessor;
  private intentDecoder: IntentDecoder;
  private responseEncoder: ResponseEncoder;
  private bioethicsGovernor: BioethicsGovernor;
  private io: SocketIOServer;
  private userConnections: Map<string, Socket> = new Map();

  constructor(
    signalProcessor: NeuralSignalProcessor,
    intentDecoder: IntentDecoder,
    responseEncoder: ResponseEncoder,
    bioethicsGovernor: BioethicsGovernor,
    io: SocketIOServer
  ) {
    this.signalProcessor = signalProcessor;
    this.intentDecoder = intentDecoder;
    this.responseEncoder = responseEncoder;
    this.bioethicsGovernor = bioethicsGovernor;
    this.io = io;
  }

  async initialize(): Promise<void> {
    logger.info('Neural Interface Manager is online.');
  }

  public handleUserConnection(userId: string, socket: Socket): void {
    this.userConnections.set(userId, socket);
    socket.on('neural_data_stream', (data) => this.processNeuralData(userId, data));
    socket.emit('connection_established', { message: 'Neural link synchronized.' });
  }

  public handleUserDisconnection(userId: string): void {
    this.userConnections.delete(userId);
  }

  private async processNeuralData(userId: string, rawData: any): Promise<void> {
    try {
      // 1. Process and clean the raw neural signal
      const processedData: NeuralData = await this.signalProcessor.process(rawData);

      // 2. Decode the user's intent from the processed signal
      const decodedIntent: DecodedIntent = await this.intentDecoder.decode(processedData);

      // 3. Bioethical Governance Check
      const ethicalVerdict = await this.bioethicsGovernor.evaluateIntent(userId, decodedIntent);
      if (!ethicalVerdict.isAllowed) {
        logger.warn(`Intent blocked by Bioethics Governor for user ${userId}: ${ethicalVerdict.reason}`);
        this.sendErrorToUser(userId, 'Your request was blocked for safety reasons.');
        return;
      }

      // 4. If intent is clear, formulate a task for the AGI
      if (decodedIntent.confidence > 0.8) {
        logger.info(`High-confidence intent '${decodedIntent.intent}' decoded for user ${userId}.`);
        const agiTask = {
          prompt: `User ${userId} is thinking about: ${decodedIntent.intent}`,
          context: decodedIntent.parameters,
          priority: 10, // High priority for direct neural commands
          metadata: { source: 'neural_interface', userId },
        };

        // 5. Send the task to the AGI Core Service
        const agiResponse = await this.sendTaskToAGI(agiTask);

        // 6. Encode the AGI's response into a neural pattern
        const neuralResponse = await this.responseEncoder.encode(agiResponse);

        // 7. Stream the response back to the user's BCI
        this.sendResponseToUser(userId, neuralResponse);
      }
    } catch (error) {
      logger.error(`Error processing neural data for user ${userId}:`, error);
      this.sendErrorToUser(userId, 'An error occurred while processing your thought.');
    }
  }

  private async sendTaskToAGI(task: any): Promise<any> {
    try {
      const response = await axios.post(`${AGI_CORE_API}/task`, task);
      return response.data;
    } catch (error) {
      logger.error('Failed to send task to AGI Core Service:', error);
      throw new Error('Could not communicate with AGI Core.');
    }
  }

  private sendResponseToUser(userId: string, neuralResponse: any): void {
    const socket = this.userConnections.get(userId);
    if (socket) {
      socket.emit('neural_response_stream', neuralResponse);
    }
  }

  private sendErrorToUser(userId: string, message: string): void {
    const socket = this.userConnections.get(userId);
    if (socket) {
      socket.emit('interface_error', { message });
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Neural Interface Manager.');
    this.userConnections.forEach(socket => socket.disconnect());
  }
}
