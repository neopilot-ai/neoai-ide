import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({ status: 'healthy', message: 'Interplanetary Communications Service is operational.' });
});

export { router as healthRouter };
