import jwt from 'jsonwebtoken';
import { db, createUser } from '../store';
import { AuthTokenPayload, User } from '../models';
import { verifyPassword } from '../utils/passwords';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function register(email: string, password: string): { user: User; token: string } {
  const { user } = createUser(email, password);
  const token = generateToken(user);
  return { user, token };
}

export function login(email: string, password: string): { user: User; token: string } {
  const user = db.users.find((u) => u.email === email);
  if (!user || !verifyPassword(password, user.hashedPassword)) {
    throw new Error('Invalid credentials');
  }
  const token = generateToken(user);
  return { user, token };
}

export function generateToken(user: User): string {
  const payload: AuthTokenPayload = { userId: user.id, email: user.email };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}
