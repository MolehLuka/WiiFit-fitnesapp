import { Request, Response, NextFunction } from 'express';
import { query } from '../db';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = res.locals.userId as number | undefined;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const result = await query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (err) {
    console.error('[requireAdmin] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
