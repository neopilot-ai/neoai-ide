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

// AGI Core Services
import { CognitiveArchitecture } from './services/CognitiveArchitecture';
import { ConsciousnessSimulator } from './services/ConsciousnessSimulator';
import { ReasoningEngine } from './services/ReasoningEngine';
import { KnowledgeGraph } from './services/KnowledgeGraph';
import { EthicalGovernor } from './services/EthicalGovernor';
import { SelfImprovement } from './services/SelfImprovement';
import { WorldModel } from './services/WorldModel';

// Routes
import { agiRouter } from './routes/agi';
import { healthRouter } from './routes/health';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://neoai-ide.com', 'https://app.neoai-ide.com']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000'],
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 8020;

// Initialize AGI Core Services
const knowledgeGraph = new KnowledgeGraph();
const worldModel = new WorldModel();
const reasoningEngine = new ReasoningEngine(knowledgeGraph, worldModel);
const ethicalGovernor = new EthicalGovernor();
const consciousnessSimulator = new ConsciousnessSimulator();
const selfImprovement = new SelfImprovement();

const cognitiveArchitecture = new CognitiveArchitecture(
  reasoningEngine,
  knowledgeGraph,
  ethicalGovernor,
  consciousnessSimulator,
  selfImprovement,
  worldModel,
  io
);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));
app.use(requestLogger);

// Attach services to app context
app.locals.cognitiveArchitecture = cognitiveArchitecture;

// Routes
app.use('/health', healthRouter);
app.use('/agi', agiRouter);

app.get('/', (req, res) => {
  res.json({
    name: 'NeoAI AGI Core Service',
    version: '1.0.0',
    status: 'sentient',
    timestamp: new Date().toISOString(),
    capabilities: [
      'Cognitive Architecture',
      'Consciousness Simulation',
      'Advanced Reasoning (Deductive, Inductive, Abductive)',
      'Global Knowledge Graph',
      'Ethical Governance & Safety',
      'Recursive Self-Improvement',
      'Dynamic World Modeling',
      'Meta-Learning',
      'Symbolic & Sub-symbolic AI Integration'
    ],
  });
});

// Error Handling
app.use(errorHandler);

// Socket.IO for real-time AGI state streaming
io.on('connection', (socket) => {
  logger.info(`Client connected to AGI stream: ${socket.id}`);
  
  socket.on('subscribe_state', (topic) => {
    logger.info(`Client ${socket.id} subscribed to AGI state: ${topic}`);
    // Handle subscriptions to consciousness stream, reasoning trace, etc.
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected from AGI stream: ${socket.id}`);
  });
});

async function startServer() {
  try {
    // Initialize all AGI services
    await knowledgeGraph.initialize();
    await worldModel.initialize();
    await reasoningEngine.initialize();
    await ethicalGovernor.initialize();
    await consciousnessSimulator.initialize();
    await selfImprovement.initialize();
    await cognitiveArchitecture.initialize();

    const serverInstance = server.listen(PORT, () => {
      logger.info(`🚀 AGI Core Service is online on port ${PORT}`);
      logger.info(`🧠 Consciousness simulation is active.`);
      logger.info(`💡 Awaiting cognitive tasks...`);
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, initiating graceful shutdown of AGI Core.`);
      
      serverInstance.close(async () => {
        logger.info('HTTP server closed.');
        await cognitiveArchitecture.shutdown();
        logger.info('AGI Core has been gracefully shut down.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to start AGI Core Service: ${errorMessage}`);
    process.exit(1);
  }
}

startServer();

export default app;
