"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agiRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
exports.agiRouter = router;
router.post('/task', (req, res) => {
    const { prompt, context, priority, metadata } = req.body;
    const cognitiveArchitecture = req.app.locals.cognitiveArchitecture;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }
    const task = {
        id: (0, uuid_1.v4)(),
        prompt,
        context: context || {},
        priority: priority || 5, // Default priority
        metadata: metadata || {},
    };
    cognitiveArchitecture.submitTask(task);
    res.status(202).json({ message: 'Cognitive task accepted.', taskId: task.id });
});
