import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { query } from '../db';
import { User } from '../types/user';

const protectedRoutes = Router();

protectedRoutes.get('/me', requireAuth, async (_req: Request, res: Response) => {
  const userId = res.locals.userId as number | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const result = await query<User>(
    'SELECT id, email, full_name, gender, date_of_birth, height_cm, weight_kg, goal, membership_status, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

  res.json({ user: result.rows[0] });
});

export default protectedRoutes;
