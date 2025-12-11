import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../utils/authMiddleware';
import { simulateUpgrade } from '../services/upgrades';

const router = Router();
router.use(authMiddleware);

router.post('/simulate', (req: AuthenticatedRequest, res) => {
  const { current_product_id, target_product_id } = req.body;
  if (!current_product_id || !target_product_id) {
    return res.status(400).json({ message: 'current_product_id and target_product_id required' });
  }
  try {
    const simulation = simulateUpgrade(req.user!.id, current_product_id, target_product_id);
    return res.json(simulation);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

export default router;
