import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const payload = jwt.verify(token, secret) as jwt.JwtPayload;

    // Check blacklist by jti if present
    if (payload.jti) {
      const blacklisted = await query<{ exists: boolean }>(
        'SELECT EXISTS (SELECT 1 FROM jwt_blacklist WHERE jti = $1) as exists',
        [payload.jti]
      );
      if (blacklisted.rows[0]?.exists) {
        return res.status(401).json({ message: 'Token revoked' });
      }
    }

    // Prefer standard JWT sub for user id
    const userId = payload.sub ? Number(payload.sub) : (payload as any).userId;
    if (!userId) return res.status(401).json({ message: 'Invalid token' });
    res.locals.userId = userId;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
