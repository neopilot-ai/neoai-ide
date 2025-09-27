"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const logger_1 = require("../utils/logger");
const requestLogger = (req, res, next) => {
    logger_1.logger.info(`Incoming request: ${req.method} ${req.originalUrl}`);
    next();
};
exports.requestLogger = requestLogger;
