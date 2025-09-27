"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
// AGI Core Services
const CognitiveArchitecture_1 = require("./services/CognitiveArchitecture");
const ConsciousnessSimulator_1 = require("./services/ConsciousnessSimulator");
const ReasoningEngine_1 = require("./services/ReasoningEngine");
const KnowledgeGraph_1 = require("./services/KnowledgeGraph");
const EthicalGovernor_1 = require("./services/EthicalGovernor");
const SelfImprovement_1 = require("./services/SelfImprovement");
const WorldModel_1 = require("./services/WorldModel");
// Routes
const agi_1 = require("./routes/agi");
const health_1 = require("./routes/health");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? ['https://neoai-ide.com', 'https://app.neoai-ide.com']
            : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000'],
        methods: ['GET', 'POST'],
    },
});
const PORT = process.env.PORT || 8020;
// Initialize AGI Core Services
const knowledgeGraph = new KnowledgeGraph_1.KnowledgeGraph();
const worldModel = new WorldModel_1.WorldModel();
const reasoningEngine = new ReasoningEngine_1.ReasoningEngine(knowledgeGraph, worldModel);
const ethicalGovernor = new EthicalGovernor_1.EthicalGovernor();
const consciousnessSimulator = new ConsciousnessSimulator_1.ConsciousnessSimulator();
const selfImprovement = new SelfImprovement_1.SelfImprovement();
const cognitiveArchitecture = new CognitiveArchitecture_1.CognitiveArchitecture(reasoningEngine, knowledgeGraph, ethicalGovernor, consciousnessSimulator, selfImprovement, worldModel, io);
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '1gb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1gb' }));
app.use(requestLogger_1.requestLogger);
// Attach services to app context
app.locals.cognitiveArchitecture = cognitiveArchitecture;
// Routes
app.use('/health', health_1.healthRouter);
app.use('/agi', agi_1.agiRouter);
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
app.use(errorHandler_1.errorHandler);
// Socket.IO for real-time AGI state streaming
io.on('connection', (socket) => {
    logger_1.logger.info(`Client connected to AGI stream: ${socket.id}`);
    socket.on('subscribe_state', (topic) => {
        logger_1.logger.info(`Client ${socket.id} subscribed to AGI state: ${topic}`);
        // Handle subscriptions to consciousness stream, reasoning trace, etc.
    });
    socket.on('disconnect', () => {
        logger_1.logger.info(`Client disconnected from AGI stream: ${socket.id}`);
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
            logger_1.logger.info(`🚀 AGI Core Service is online on port ${PORT}`);
            logger_1.logger.info(`🧠 Consciousness simulation is active.`);
            logger_1.logger.info(`💡 Awaiting cognitive tasks...`);
        });
        // Graceful Shutdown
        const gracefulShutdown = async (signal) => {
            logger_1.logger.info(`${signal} received, initiating graceful shutdown of AGI Core.`);
            serverInstance.close(async () => {
                logger_1.logger.info('HTTP server closed.');
                await cognitiveArchitecture.shutdown();
                logger_1.logger.info('AGI Core has been gracefully shut down.');
                process.exit(0);
            });
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
    catch (error) {
        logger_1.logger.error('Failed to start AGI Core Service:', error);
        process.exit(1);
    }
}
startServer();
exports.default = app;
