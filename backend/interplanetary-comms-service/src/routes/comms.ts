import { Router } from 'express';
import { DtnRouter } from '../services/DtnRouter';

const router = Router();

router.post('/send-bundle', async (req, res) => {
  const { source, destination, payload, priority } = req.body;
  const dtnRouter: DtnRouter = req.app.locals.dtnRouter;

  if (!source || !destination || !payload) {
    return res.status(400).json({ error: 'Source, destination, and payload are required.' });
  }

  try {
    const payloadBuffer = Buffer.from(payload, 'base64'); // Assuming payload is base64 encoded

    const bundleId = await dtnRouter.routeBundle({
      source,
      destination,
      payload: payloadBuffer,
      priority: priority || 5,
      isAck: false,
    });

    res.status(202).json({ message: 'Bundle accepted for transmission.', bundleId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to route bundle.', message: error.message });
  }
});

export { router as commsRouter };
