import { Router } from 'express';
import { NeuralInterfaceManager } from '../services/NeuralInterfaceManager';

const router = Router();

// This route could be used to get connection status or user session info
router.get('/status/:userId', (req, res) => {
  const { userId } = req.params;
  const manager: NeuralInterfaceManager = req.app.locals.neuralInterfaceManager;
  
  // This is a placeholder for a real status check
  const isConnected = manager['userConnections'].has(userId);

  if (isConnected) {
    res.status(200).json({ userId, status: 'connected', message: 'Neural link is active.' });
  } else {
    res.status(404).json({ userId, status: 'disconnected', message: 'No active neural link found for this user.' });
  }
});

export { router as interfaceRouter };
