import { Router } from 'express';
import { HybridOrchestrator } from '../services/HybridOrchestrator';

const router = Router();

router.post('/solve', async (req, res) => {
  const { description, data, metadata } = req.body;
  const hybridOrchestrator: HybridOrchestrator = req.app.locals.hybridOrchestrator;

  if (!description || !data) {
    return res.status(400).json({ error: 'Problem description and data are required.' });
  }

  try {
    const solution = await hybridOrchestrator.solveProblem({
      description,
      data,
      metadata: metadata || { source: 'USER_DIRECT' },
    });

    res.status(200).json(solution);
  } catch (error) {
    res.status(500).json({ error: 'Failed to solve hybrid problem.', message: error.message });
  }
});

export { router as hybridRouter };
