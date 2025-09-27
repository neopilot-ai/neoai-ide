import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Core Neural Interface Services
import { NeuralInterfaceManager } from './services/NeuralInterfaceManager';
import { NeuralSignalProcessor } from './services/NeuralSignalProcessor';
import { IntentDecoder } from './services/IntentDecoder';
import { ResponseEncoder } from './services/ResponseEncoder';
import { BioethicsGovernor } from './services/BioethicsGovernor';

// Routes
import { interfaceRouter } from './routes/interface';
import { healthRouter } from './routes/health';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' },
  transports: ['websocket'], // Force websockets for low latency
});

const PORT = process.env.PORT || 8023;

// Initialize Services
const signalProcessor = new NeuralSignalProcessor();
const intentDecoder = new IntentDecoder();
const responseEncoder = new ResponseEncoder();
const bioethicsGovernor = new BioethicsGovernor();
const neuralInterfaceManager = new NeuralInterfaceManager(
  signalProcessor,
  intentDecoder,
  responseEncoder,
  bioethicsGovernor,
  io
);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(requestLogger);

// Attach services to app context
app.locals.neuralInterfaceManager = neuralInterfaceManager;

// Routes
app.use('/health', healthRouter);
app.use('/interface', interfaceRouter);

app.get('/', (req, res) => {
  res.json({
    name: 'NeoAI Neural Interface Service',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    capabilities: [
      'Real-time EEG/fMRI Signal Processing',
      'Neural Intent Decoding (Thought-to-Command)',
      'AGI Response Encoding (Information-to-Neural-Pattern)',
      'Bioethical Governance for Mental Privacy',
      'High-Bandwidth, Low-Latency Brain-Computer-Interface Link'
    ],
  });
});

// Error Handling
app.use(errorHandler);

// Socket.IO for the Neural Data Stream
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  if (!userId) {
    socket.disconnect(true);
    return;
  }
  logger.info(`User ${userId} connected to Neural Interface.`);
  neuralInterfaceManager.handleUserConnection(userId, socket);

  socket.on('disconnect', () => {
    logger.info(`User ${userId} disconnected from Neural Interface.`);
    neuralInterfaceManager.handleUserDisconnection(userId);
  });
});

async function startServer() {
  try {
    // Initialize all services
    await signalProcessor.initialize();
    await intentDecoder.initialize();
    await responseEncoder.initialize();
    await bioethicsGovernor.initialize();
    await neuralInterfaceManager.initialize();

    const serverInstance = server.listen(PORT, () => {
      logger.info(`🚀 Neural Interface Service is online on port ${PORT}`);
      logger.info(`🧠 Awaiting neural synchronization...`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down Neural Interface.`);
      serverInstance.close(async () => {
        logger.info('HTTP server closed.');
        await neuralInterfaceManager.shutdown();
        logger.info('Neural Interface Service has been gracefully shut down.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start Neural Interface Service:', error);
    process.exit(1);
  }
}

startServer();

export default app;
