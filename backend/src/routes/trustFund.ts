import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../utils/authMiddleware';
import { applyYield, deposit, getAccount } from '../services/trustFund';

const router = Router();
router.use(authMiddleware);

router.get('/me', (req: AuthenticatedRequest, res) => {
  const account = getAccount(req.user!.id);
  if (!account) {
    return res.status(404).json({ message: 'Trust fund not found' });
  }
  return res.json(account);
});

router.post('/deposit', (req: AuthenticatedRequest, res) => {
  const { amount } = req.body;
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be positive number' });
  }
  try {
    const account = deposit(req.user!.id, amount);
    return res.json(account);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

router.post('/apply-yield', (req: AuthenticatedRequest, res) => {
  try {
    const account = applyYield(req.user!.id, new Date());
    return res.json(account);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

export default router;
