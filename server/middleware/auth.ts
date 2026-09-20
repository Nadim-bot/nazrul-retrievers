import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isMongoDBActive, MUser } from '../db/mongodb';
import { getFallbackData } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'NazrulRetrievers_JKKNIU_2026_jwt_secret_@#%';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: 'student' | 'admin' | 'moderator';
    studentId?: string;
    department?: string;
    phone?: string;
    sessionYear?: string;
    avatar?: string;
  };
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Missing token.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;

    // Fetch the user's current record from the database to enforce real-time status and role changes
    let dbUser: any = null;

    if (isMongoDBActive()) {
      dbUser = await MUser.findOne({ id: String(decoded.id) });
    } else {
      const { store } = getFallbackData();
      dbUser = store.users.find((u: any) => String(u.id) === String(decoded.id));
    }

    if (!dbUser) {
      return res.status(401).json({ error: 'Access Denied: User account no longer exists in our system.' });
    }

    // Verify account status (case-insensitive checks)
    const userStatus = (dbUser.status || '').trim().toLowerCase();
    const accountStatus = (dbUser.accountStatus || '').trim().toLowerCase();
    const isSuspendedFlag = dbUser.is_suspended || dbUser.isSuspended;

    if (userStatus === 'suspended' || accountStatus === 'suspended' || isSuspendedFlag) {
      return res.status(403).json({
        error: dbUser.role === 'moderator' 
          ? 'Access Denied: Your Moderator account has been suspended by the platform administration.'
          : 'Access Denied: Your account has been suspended. Please contact university administrators.'
      });
    }

    if (userStatus === 'disabled' || accountStatus === 'disabled') {
      return res.status(403).json({
        error: dbUser.role === 'moderator'
          ? 'Access Denied: Your Moderator privileges have been disabled by the platform administration.'
          : 'Access Denied: This account has been disabled.'
      });
    }

    if (userStatus === 'banned' || accountStatus === 'banned') {
      return res.status(403).json({ error: 'Access Denied: This account has been permanently banned.' });
    }

    if (userStatus === 'locked' || accountStatus === 'locked') {
      return res.status(403).json({ error: 'Access Denied: This account is locked for security reasons.' });
    }

    // Ensure req.user has the absolute latest role from the database
    if (req.user) {
      req.user.role = dbUser.role;
    }

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function authorizeAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrative privileges required.' });
  }
  next();
}

export function authorizeModOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'moderator')) {
    return res.status(403).json({ error: 'Access denied. Moderator or Administrative privileges required.' });
  }
  next();
}
