"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const errorHandler = (err, req, res, next) => {
    logger_1.logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
    res.status(500).json({
        error: 'An internal server error occurred.',
        message: err.message,
    });
};
exports.errorHandler = errorHandler;
