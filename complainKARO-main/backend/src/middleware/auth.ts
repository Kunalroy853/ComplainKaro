import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  role: 'student' | 'warden';
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as AuthPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role: 'student' | 'warden') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: `Access restricted to ${role}s` });
      return;
    }
    next();
  };
}
