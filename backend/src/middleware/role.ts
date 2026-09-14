import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export type Role = 'super_admin' | 'ring_admin' | 'member';

/** Der Super-Admin darf ringübergreifend alles. */
export const isSuperAdmin = (req: AuthRequest) => req.user?.role === 'super_admin';

/** Ring-Admins verwalten ihren eigenen Ring, der Super-Admin jeden. */
export const isAdmin = (req: AuthRequest) =>
  req.user?.role === 'super_admin' || req.user?.role === 'ring_admin';

export const requireRole = (...roles: Role[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Nicht angemeldet' });
    if (!roles.includes(req.user.role as Role)) {
      return res.status(403).json({ error: 'Keine Berechtigung für diese Aktion' });
    }
    next();
  };

export const requireAdmin = requireRole('super_admin', 'ring_admin');
export const requireSuperAdmin = requireRole('super_admin');

/**
 * Prüft, ob der angemeldete Benutzer für den angegebenen Ring handeln darf.
 * Ring-Admins nur für den eigenen Ring, der Super-Admin für jeden.
 */
export const mayActForRing = (req: AuthRequest, ringId: number) =>
  isSuperAdmin(req) || req.user?.ringId === ringId;
