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

// Core Interplanetary Services
import { DtnRouter } from './services/DtnRouter';
import { OrbitalMechanics } from './services/OrbitalMechanics';
import { NetworkSimulator } from './services/NetworkSimulator';
import { QuantumKeyDistribution } from './services/QuantumKeyDistribution';

// Routes
import { commsRouter } from './routes/comms';
import { healthRouter } from './routes/health';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT || 8021;

// Initialize Services
const orbitalMechanics = new OrbitalMechanics();
const networkSimulator = new NetworkSimulator(orbitalMechanics);
const qkd = new QuantumKeyDistribution();
const dtnRouter = new DtnRouter(orbitalMechanics, networkSimulator, qkd);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use(requestLogger);

// Attach services to app context
app.locals.dtnRouter = dtnRouter;
app.locals.orbitalMechanics = orbitalMechanics;

// Routes
app.use('/health', healthRouter);
app.use('/comms', commsRouter);

app.get('/', (req, res) => {
  res.json({
    name: 'NeoAI Interplanetary Communications Service',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    network_nodes: ['Earth_Gateway', 'Lunar_Gateway', 'Mars_Gateway', 'LEO_Relay', 'Lagrange_L1_Relay'],
    capabilities: [
      'Delay-Tolerant Networking (DTN)',
      'Bundle Protocol v7',
      'Licklider Transmission Protocol (LTP)',
      'Quantum Key Distribution (QKD) for Secure Channels',
      'Predictive Routing based on Orbital Mechanics',
      'High-Latency Data Compression & Error Correction',
      'Interplanetary Network Simulation'
    ],
  });
});

// Error Handling
app.use(errorHandler);

// Socket.IO for real-time network status
io.on('connection', (socket) => {
  logger.info(`Client connected to Interplanetary network monitor: ${socket.id}`);
  
  const statusInterval = setInterval(() => {
    socket.emit('network_status', dtnRouter.getNetworkStatus());
  }, 1000);

  socket.on('disconnect', () => {
    clearInterval(statusInterval);
    logger.info(`Client disconnected from Interplanetary network monitor: ${socket.id}`);
  });
});

async function startServer() {
  try {
    // Initialize all services
    await orbitalMechanics.initialize();
    await networkSimulator.initialize();
    await qkd.initialize();
    await dtnRouter.initialize();

    const serverInstance = server.listen(PORT, () => {
      logger.info(`🚀 Interplanetary Communications Service is online on port ${PORT}`);
      logger.info(`📡 Listening for signals from across the solar system...`);
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down Interplanetary Comms.`);
      
      serverInstance.close(async () => {
        logger.info('HTTP server closed.');
        await dtnRouter.shutdown();
        logger.info('Interplanetary Comms Service has been gracefully shut down.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start Interplanetary Communications Service:', error);
    process.exit(1);
  }
}

startServer();

export default app;
