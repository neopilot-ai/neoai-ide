"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
exports.healthRouter = router;
router.get('/', (req, res) => {
    res.status(200).json({ status: 'healthy', message: 'AGI Core Service is operational.' });
});
