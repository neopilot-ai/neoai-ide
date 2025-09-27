import { Router } from 'express';
import { FoundryOrchestrator } from '../services/FoundryOrchestrator';
import { ConsciousnessBlueprint } from '../services/ConsciousnessDesigner';

const router = Router();

router.post('/experiment', async (req, res) => {
  const blueprint: Omit<ConsciousnessBlueprint, 'id' | 'createdAt'> = req.body;
  const orchestrator: FoundryOrchestrator = req.app.locals.orchestrator;

  if (!blueprint.name || !blueprint.baseTheory || !blueprint.substrate) {
    return res.status(400).json({ error: 'Blueprint name, base theory, and substrate are required.' });
  }

  try {
    // The design part is synchronous, but the experiment run is asynchronous
    const newBlueprint = orchestrator['designer'].createBlueprint(blueprint);
    const experiment = await orchestrator.runExperiment(newBlueprint);

    res.status(202).json({ 
      message: 'Consciousness experiment initiated.', 
      experimentId: experiment.id, 
      simulationId: experiment.simulation.id 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start experiment.', message: error.message });
  }
});

router.get('/experiment/:id', (req, res) => {
  const { id } = req.params;
  const orchestrator: FoundryOrchestrator = req.app.locals.orchestrator;
  const experiment = orchestrator.getExperiment(id);

  if (experiment) {
    res.status(200).json(experiment);
  } else {
    res.status(404).json({ error: 'Experiment not found.' });
  }
});

router.post('/experiment/:id/terminate', async (req, res) => {
  const { id } = req.params;
  const orchestrator: FoundryOrchestrator = req.app.locals.orchestrator;
  
  try {
    await orchestrator.terminateExperiment(id);
    res.status(200).json({ message: `Experiment ${id} termination process initiated.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to terminate experiment.', message: error.message });
  }
});

export { router as foundryRouter };
