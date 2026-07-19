import { Request, Response, NextFunction } from 'express';
import { AuthenticatedUser } from './requireAuth';

export function requireRole(...allowed: AuthenticatedUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have access to this resource.' });
    }
    return next();
  };
}

/**
 * A dealer may only read their own dashboard unless they're an admin.
 * Prevents dealer A from querying dealer B's data by guessing/enumerating
 * dealerId in the URL — critical given this endpoint exposes revenue-
 * adjacent metrics (views, inquiries, sales).
 */
export function requireOwnDealerIdOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  const { dealerId } = req.params;
  if (req.user.role === 'admin' || req.user.id === dealerId) {
    return next();
  }
  return res.status(403).json({ error: 'You can only access your own dealer dashboard.' });
}
