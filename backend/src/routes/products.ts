import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../utils/authMiddleware';
import { listOwnerships, listProducts, registerOwnership } from '../services/products';
import { db } from '../store';

const router = Router();

router.get('/', (_req, res) => {
  return res.json(listProducts());
});

router.use(authMiddleware);

router.get('/owned', (req: AuthenticatedRequest, res) => {
  return res.json(listOwnerships(req.user!.id));
});

router.post('/register', (req: AuthenticatedRequest, res) => {
  const { product_id, price_paid } = req.body;
  if (!product_id || typeof price_paid !== 'number') {
    return res.status(400).json({ message: 'product_id and price_paid required' });
  }
  try {
    const { ownership, upgradeRight } = registerOwnership(req.user!.id, product_id, price_paid);
    const product = db.products.find((p) => p.id === product_id);
    return res.json({ ownership, upgradeRight, product });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

export default router;
