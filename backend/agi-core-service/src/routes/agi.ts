import { Router } from 'express';
import { CognitiveArchitecture, CognitiveTask } from '../services/CognitiveArchitecture';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/task', (req, res) => {
  const { prompt, context, priority, metadata } = req.body;
  const cognitiveArchitecture: CognitiveArchitecture = req.app.locals.cognitiveArchitecture;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const task: CognitiveTask = {
    id: uuidv4(),
    prompt,
    context: context || {},
    priority: priority || 5, // Default priority
    metadata: metadata || {},
  };

  cognitiveArchitecture.submitTask(task);

  res.status(202).json({ message: 'Cognitive task accepted.', taskId: task.id });
});

export { router as agiRouter };
