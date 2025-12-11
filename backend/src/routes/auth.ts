import { Router, Request, Response } from 'express';
import { login, register } from '../services/auth';
import { db } from '../store';

const router = Router();

interface AuthBody {
  email: string;
  password: string;
}

router.post('/register', (req: Request<unknown, unknown, AuthBody>, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }
  try {
    const { user, token } = register(email, password);
    return res.json({ user: { id: user.id, email: user.email }, token });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

router.post('/login', (req: Request<unknown, unknown, AuthBody>, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }
  try {
    const { user, token } = login(email, password);
    const trustFund = db.trustFunds.find((t) => t.userId === user.id);
    return res.json({ user: { id: user.id, email: user.email }, token, trustFund });
  } catch (error: any) {
    return res.status(401).json({ message: error.message });
  }
});

export default router;
