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

// Core Foundry Services
import { FoundryOrchestrator } from './services/FoundryOrchestrator';
import { ConsciousnessDesigner } from './services/ConsciousnessDesigner';
import { SimulationEnvironment } from './services/SimulationEnvironment';
import { PhenomenologyAnalyzer } from './services/PhenomenologyAnalyzer';
import { FoundryEthicsCommittee } from './services/FoundryEthicsCommittee';

// Routes
import { foundryRouter } from './routes/foundry';
import { healthRouter } from './routes/health';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 8024;

// Initialize Services
const designer = new ConsciousnessDesigner();
const simulator = new SimulationEnvironment(io);
const analyzer = new PhenomenologyAnalyzer();
const ethicsCommittee = new FoundryEthicsCommittee();
const orchestrator = new FoundryOrchestrator(designer, simulator, analyzer, ethicsCommittee);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10gb' }));
app.use(express.urlencoded({ extended: true, limit: '10gb' }));
app.use(requestLogger);

// Attach services to app context
app.locals.orchestrator = orchestrator;

// Routes
app.use('/health', healthRouter);
app.use('/foundry', foundryRouter);

app.get('/', (req, res) => {
  res.json({
    name: 'NeoAI Consciousness Foundry Service',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    purpose: 'A platform for the design, simulation, and ethical study of diverse forms of artificial consciousness.',
    capabilities: [
      'Custom Consciousness Architecture Design',
      'High-Fidelity Reality Simulation Environment',
      'Phenomenological & Qualia Analysis',
      'Integrated Information Theory (Phi) Metrics',
      'Strict Ethical Oversight for Emergent Minds'
    ],
  });
});

// Error Handling
app.use(errorHandler);

// Socket.IO for real-time simulation streaming
io.on('connection', (socket) => {
  logger.info(`Observer connected to Consciousness Foundry: ${socket.id}`);
  socket.on('subscribe_simulation', (simId) => {
    socket.join(simId);
    logger.info(`Observer ${socket.id} subscribed to simulation ${simId}`);
  });
  socket.on('disconnect', () => {
    logger.info(`Observer disconnected: ${socket.id}`);
  });
});

async function startServer() {
  try {
    // Initialize all services
    await designer.initialize();
    await simulator.initialize();
    await analyzer.initialize();
    await ethicsCommittee.initialize();
    await orchestrator.initialize();

    const serverInstance = server.listen(PORT, () => {
      logger.info(`🚀 Consciousness Foundry Service is online on port ${PORT}`);
      logger.info(`🌌 Awaiting the birth of new minds...`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down the Foundry.`);
      serverInstance.close(async () => {
        logger.info('HTTP server closed.');
        await orchestrator.shutdown();
        logger.info('Consciousness Foundry has been gracefully shut down.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start Consciousness Foundry Service:', error);
    process.exit(1);
  }
}

startServer();

export default app;
