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

// Core Quantum-AI Services
import { HybridOrchestrator } from './services/HybridOrchestrator';
import { ProblemDecomposer } from './services/ProblemDecomposer';
import { CircuitGenerator } from './services/CircuitGenerator';
import { QuantumJobManager } from './services/QuantumJobManager';
import { ResultInterpreter } from './services/ResultInterpreter';

// Routes
import { hybridRouter } from './routes/hybrid';
import { healthRouter } from './routes/health';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' },
});

const PORT = process.env.PORT || 8022;

// Initialize Services
const problemDecomposer = new ProblemDecomposer();
const circuitGenerator = new CircuitGenerator();
const quantumJobManager = new QuantumJobManager(io);
const resultInterpreter = new ResultInterpreter();
const hybridOrchestrator = new HybridOrchestrator(
  problemDecomposer,
  circuitGenerator,
  quantumJobManager,
  resultInterpreter
);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));
app.use(requestLogger);

// Attach services to app context
app.locals.hybridOrchestrator = hybridOrchestrator;

// Routes
app.use('/health', healthRouter);
app.use('/hybrid', hybridRouter);

app.get('/', (req, res) => {
  res.json({
    name: 'NeoAI Quantum-AI Integration Service',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    capabilities: [
      'Classical-Quantum Problem Decomposition',
      'Automated Quantum Circuit Generation',
      'Hybrid Quantum Job Orchestration',
      'Quantum Result Interpretation & Error Correction',
      'Integration with AGI Core & Quantum Simulators'
    ],
  });
});

// Error Handling
app.use(errorHandler);

// Socket.IO for real-time job status
io.on('connection', (socket) => {
  logger.info(`Client connected to Quantum Job monitor: ${socket.id}`);
  socket.on('subscribe_job', (jobId) => {
    socket.join(jobId);
    logger.info(`Client ${socket.id} subscribed to job ${jobId}`);
  });
  socket.on('disconnect', () => {
    logger.info(`Client disconnected from Quantum Job monitor: ${socket.id}`);
  });
});

async function startServer() {
  try {
    // Initialize all services
    await problemDecomposer.initialize();
    await circuitGenerator.initialize();
    await quantumJobManager.initialize();
    await resultInterpreter.initialize();
    await hybridOrchestrator.initialize();

    const serverInstance = server.listen(PORT, () => {
      logger.info(`🚀 Quantum-AI Integration Service is online on port ${PORT}`);
      logger.info(`🌉 Bridging classical AGI and quantum computation...`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down Quantum-AI bridge.`);
      serverInstance.close(async () => {
        logger.info('HTTP server closed.');
        await hybridOrchestrator.shutdown();
        logger.info('Quantum-AI Integration Service has been gracefully shut down.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start Quantum-AI Integration Service:', error);
    process.exit(1);
  }
}

startServer();

export default app;
