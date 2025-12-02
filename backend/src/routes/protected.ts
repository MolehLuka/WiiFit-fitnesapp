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
            u.membership_status, u.is_admin, u.created_at, u.updated_at,
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
  const userId = res.locals.userId as number;
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
        gc.blurb AS class_blurb,
        (
          SELECT COUNT(*) FROM bookings b
          WHERE b.session_id = cs.id AND b.status = 'booked'
        ) AS booked_count,
        (
          SELECT COUNT(*) FROM bookings b
          WHERE b.session_id = cs.id AND b.user_id = $${params.length + 1} AND b.status = 'booked'
        ) AS user_has_booking
      FROM class_sessions cs
      JOIN group_classes gc ON gc.id = cs.class_id
      ${where}
      ORDER BY cs.starts_at ASC
    `;
    const result = await query(sql, [...params, userId]);
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

// Book a class session
protectedRoutes.post('/sessions/:id/book', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.userId as number;
  const sessionId = Number(req.params.id);
  if (isNaN(sessionId)) return res.status(400).json({ message: 'Invalid session id' });
  try {
    // Fetch session + current booked count
    const r = await query<{
      id: number;
      capacity: number;
      starts_at: string;
      booked_count: number;
    }>(
      `SELECT cs.id, cs.capacity, cs.starts_at,
        (SELECT COUNT(*) FROM bookings b WHERE b.session_id = cs.id AND b.status='booked') AS booked_count
       FROM class_sessions cs WHERE cs.id = $1`,
      [sessionId]
    );
    const s = r.rows[0];
    if (!s) return res.status(404).json({ message: 'Session not found' });
    if (new Date(s.starts_at) < new Date()) return res.status(400).json({ message: 'Cannot book past session' });
    if (s.booked_count >= s.capacity) return res.status(409).json({ message: 'Session full' });
    // Check if user already has an active booking
    const existingBooking = await query(
      `SELECT id, status FROM bookings WHERE user_id = $1 AND session_id = $2`,
      [userId, sessionId]
    );
    if (existingBooking.rows.length > 0) {
      const booking = existingBooking.rows[0] as { id: number; status: string };
      if (booking.status === 'booked') {
        return res.status(409).json({ message: 'Already booked' });
      }
      // Reactivate canceled booking
      await query(`UPDATE bookings SET status = 'booked' WHERE id = $1`, [booking.id]);
    } else {
      // Create new booking
      await query('INSERT INTO bookings (user_id, session_id, status) VALUES ($1, $2, $3)', [userId, sessionId, 'booked']);
    }
    res.json({ message: 'Booked' });
  } catch (err) {
    console.error('[sessions/:id/book] error', err);
    res.status(500).json({ message: 'Failed to book session' });
  }
});

// Cancel a booking
protectedRoutes.post('/sessions/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.userId as number;
  const sessionId = Number(req.params.id);
  if (isNaN(sessionId)) return res.status(400).json({ message: 'Invalid session id' });
  try {
    // Ensure booking exists and session not started
    const r = await query<{
      starts_at: string;
    }>(
      `SELECT cs.starts_at FROM class_sessions cs WHERE cs.id = $1`,
      [sessionId]
    );
    const s = r.rows[0];
    if (!s) return res.status(404).json({ message: 'Session not found' });
    if (new Date(s.starts_at) < new Date()) return res.status(400).json({ message: 'Cannot cancel past session' });
    await query('UPDATE bookings SET status = ' + "'canceled'" + ' WHERE user_id = $1 AND session_id = $2 AND status = ' + "'booked'", [userId, sessionId]);
    res.json({ message: 'Canceled' });
  } catch (err) {
    console.error('[sessions/:id/cancel] error', err);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
});

// User bookings list
protectedRoutes.get('/bookings', requireAuth, async (_req: Request, res: Response) => {
  const userId = res.locals.userId as number;
  try {
    const classBookings = await query<any>(
      `SELECT b.id, b.session_id, b.status, b.created_at,
              cs.starts_at, cs.duration_min, cs.capacity,
              gc.id as class_id, gc.title AS class_title, gc.blurb as class_blurb,
              'class' as booking_type
       FROM bookings b
       JOIN class_sessions cs ON cs.id = b.session_id
       JOIN group_classes gc ON gc.id = cs.class_id
       WHERE b.user_id = $1 AND b.status='booked'
       ORDER BY cs.starts_at ASC`,
      [userId]
    );
    
    const trainerBookings = await query<any>(
      `SELECT tb.id, tb.availability_id, tb.status, tb.created_at,
              ta.starts_at, ta.duration_min, ta.capacity,
              t.id as trainer_id, t.name as trainer_name, t.bio as trainer_bio,
              'trainer' as booking_type
       FROM trainer_bookings tb
       JOIN trainer_availability ta ON ta.id = tb.availability_id
       JOIN trainers t ON t.id = ta.trainer_id
       WHERE tb.user_id = $1 AND tb.status='booked'
       ORDER BY ta.starts_at ASC`,
      [userId]
    );
    
    res.json({ 
      classBookings: classBookings.rows,
      trainerBookings: trainerBookings.rows 
    });
  } catch (err) {
    console.error('[bookings] error', err);
    res.status(500).json({ message: 'Failed to load bookings' });
  }
});

// GET /api/protected/membership/history
protectedRoutes.get('/membership/history', requireAuth, async (_req: Request, res: Response) => {
  const userId = res.locals.userId as number | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await query<any>(
      `SELECT id, event_type, status, stripe_object_id, amount::float, currency, occurred_at
       FROM membership_events
       WHERE user_id = $1
       ORDER BY occurred_at DESC
       LIMIT 200`,
      [userId]
    );
    res.json({ events: result.rows });
  } catch (err) {
    console.error('[protected/membership/history] error', err);
    res.status(500).json({ message: 'Failed to load membership history' });
  }
});
