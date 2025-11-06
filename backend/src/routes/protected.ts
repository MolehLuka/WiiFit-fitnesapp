import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { query } from '../db';
import { User } from '../types/user';

const protectedRoutes = Router();

protectedRoutes.get('/me', requireAuth, async (_req: Request, res: Response) => {
  const userId = res.locals.userId as number | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const result = await query(
    `SELECT u.id, u.email, u.full_name, u.gender, u.date_of_birth, u.height_cm, u.weight_kg, u.goal,
            u.membership_status, u.created_at, u.updated_at,
            u.plan_id,
            p.id as plan_id_resolved, p.name as plan_name, p.price::float as plan_price, p.currency as plan_currency
     FROM users u
     LEFT JOIN plans p ON p.id = u.plan_id
     WHERE u.id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

  const row = result.rows[0] as any;
  const { plan_id_resolved, plan_name, plan_price, plan_currency, plan_id, ...user } = row;
  const plan = plan_id_resolved
    ? { id: plan_id_resolved as number, name: plan_name as string, price: plan_price as number, currency: plan_currency as string }
    : null;
  res.json({ user, plan });
});

export default protectedRoutes;
// GET /api/protected/schedule?from=ISO&to=ISO
protectedRoutes.get('/schedule', requireAuth, async (req: Request, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string };
  let where = '';
  const params: any[] = [];
  if (from) {
    params.push(new Date(from).toISOString());
    where += (where ? ' AND ' : ' WHERE ') + `cs.starts_at >= $${params.length}`;
  }
  if (to) {
    params.push(new Date(to).toISOString());
    where += (where ? ' AND ' : ' WHERE ') + `cs.starts_at <= $${params.length}`;
  }
  try {
    const sql = `
      SELECT
        cs.id,
        cs.starts_at,
        cs.duration_min,
        cs.capacity,
        gc.title AS class_title,
        gc.blurb AS class_blurb
      FROM class_sessions cs
      JOIN group_classes gc ON gc.id = cs.class_id
      ${where}
      ORDER BY cs.starts_at ASC
    `;
    const result = await query(sql, params);
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error('[protected/schedule] error', err);
    res.status(500).json({ message: 'Failed to load schedule' });
  }
});

// POST /api/protected/subscribe-plan { planId?: number, planName?: string }
protectedRoutes.post('/subscribe-plan', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.userId as number | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { planId, planName } = req.body as { planId?: number; planName?: string };
  if (!planId && !planName) {
    return res.status(400).json({ message: 'planId or planName is required' });
  }
  try {
    // Resolve plan
    let planRow: { id: number; name: string } | null = null;
    if (planId) {
      const r = await query<{ id: number; name: string }>('SELECT id, name FROM plans WHERE id = $1', [planId]);
      planRow = r.rows[0] ?? null;
    } else if (planName) {
      const r = await query<{ id: number; name: string }>('SELECT id, name FROM plans WHERE name = $1', [planName]);
      planRow = r.rows[0] ?? null;
    }
    if (!planRow) return res.status(404).json({ message: 'Plan not found' });

    await query(
      `UPDATE users SET plan_id = $1, membership_status = 'active', updated_at = now() WHERE id = $2`,
      [planRow.id, userId]
    );

    return res.status(200).json({ message: 'Subscribed', plan: planRow });
  } catch (err) {
    console.error('[protected/subscribe-plan] error', err);
    return res.status(500).json({ message: 'Failed to subscribe to plan' });
  }
});
