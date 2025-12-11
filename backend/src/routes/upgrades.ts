import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../utils/authMiddleware';
import { simulateUpgrade, executeUpgrade } from '../services/upgrades';

const router = Router();
router.use(authMiddleware);

interface UpgradeBody {
  current_product_id: string;
  target_product_id: string;
  use_trust_fund?: boolean;
}

router.post('/simulate', (req: AuthenticatedRequest<UpgradeBody>, res: Response) => {
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

router.post('/execute', (req: AuthenticatedRequest<UpgradeBody>, res: Response) => {
  const { current_product_id, target_product_id, use_trust_fund } = req.body;
  if (!current_product_id || !target_product_id) {
    return res.status(400).json({ message: 'current_product_id and target_product_id required' });
  }
  try {
    const execution = executeUpgrade(
      req.user!.id,
      current_product_id,
      target_product_id,
      Boolean(use_trust_fund),
    );
    return res.json(execution);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

export default router;
