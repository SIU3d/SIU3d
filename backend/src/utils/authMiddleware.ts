import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth';
import { db } from '../store';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Missing Authorization header' });
  }
  const [, token] = header.split(' ');
  try {
    const payload = verifyToken(token);
    const user = db.users.find((u) => u.id === payload.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = { id: user.id, email: user.email };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
