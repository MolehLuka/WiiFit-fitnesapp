import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';

const trainersRoutes = Router();

// GET /api/trainers/public -> list active trainers
trainersRoutes.get('/public', async (_req: Request, res: Response) => {
  try {
    const r = await query<any>(`SELECT id, name, bio, max_clients FROM trainers WHERE active = true ORDER BY name ASC`);
    res.json({ trainers: r.rows });
  } catch (err) {
    console.error('[trainers/public] error', err);
    res.status(500).json({ message: 'Failed to load trainers' });
  }
});

// GET /api/trainers/availability?from&to (auth required to show user booking state)
trainersRoutes.get('/availability', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.userId as number;
  const { from, to } = req.query as { from?: string; to?: string };
  let where = '';
  const params: any[] = [];
  if (from) {
    params.push(new Date(from).toISOString());
    where += (where ? ' AND ' : ' WHERE ') + `ta.starts_at >= $${params.length}`;
  }
  if (to) {
    params.push(new Date(to).toISOString());
    where += (where ? ' AND ' : ' WHERE ') + `ta.starts_at <= $${params.length}`;
  }
  try {
    const sql = `SELECT
      ta.id,
      ta.trainer_id,
      ta.starts_at,
      ta.duration_min,
      ta.capacity,
      tr.name AS trainer_name,
      tr.bio AS trainer_bio,
      (
        SELECT COUNT(*) FROM trainer_bookings tb
        WHERE tb.availability_id = ta.id AND tb.status='booked'
      ) AS booked_count,
      (
        SELECT COUNT(*) FROM trainer_bookings tb
        WHERE tb.availability_id = ta.id AND tb.user_id = $${params.length + 1} AND tb.status='booked'
      ) AS user_has_booking
    FROM trainer_availability ta
    JOIN trainers tr ON tr.id = ta.trainer_id
    ${where}
    ORDER BY ta.starts_at ASC`;
    const r = await query(sql, [...params, userId]);
    res.json({ availability: r.rows });
  } catch (err) {
    console.error('[trainers/availability] error', err);
    res.status(500).json({ message: 'Failed to load availability' });
  }
});

// POST /api/trainers/availability/:id/book
trainersRoutes.post('/availability/:id/book', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.userId as number;
  const availId = Number(req.params.id);
  if (isNaN(availId)) return res.status(400).json({ message: 'Invalid availability id' });
  try {
    const r = await query<any>(
      `SELECT ta.id, ta.capacity, ta.starts_at,
        (SELECT COUNT(*) FROM trainer_bookings tb WHERE tb.availability_id = ta.id AND tb.status='booked') AS booked_count
       FROM trainer_availability ta WHERE ta.id = $1`,
      [availId]
    );
    const a = r.rows[0];
    if (!a) return res.status(404).json({ message: 'Slot not found' });
    if (new Date(a.starts_at) < new Date()) return res.status(400).json({ message: 'Cannot book past slot' });
    if (a.booked_count >= a.capacity) return res.status(409).json({ message: 'Slot full' });
    // Check if user already has a booking for this slot
    const existingBooking = await query(
      `SELECT id, status FROM trainer_bookings WHERE user_id = $1 AND availability_id = $2`,
      [userId, availId]
    );
    if (existingBooking.rows.length > 0) {
      const booking = existingBooking.rows[0] as { id: number; status: string };
      if (booking.status === 'booked') {
        return res.status(409).json({ message: 'Already booked' });
      }
      // Reactivate canceled booking
      await query(`UPDATE trainer_bookings SET status = 'booked' WHERE id = $1`, [booking.id]);
    } else {
      // Create new booking
      await query('INSERT INTO trainer_bookings (user_id, availability_id, status) VALUES ($1, $2, $3)', [userId, availId, 'booked']);
    }
    res.json({ message: 'Booked trainer slot' });
  } catch (err) {
    console.error('[availability/:id/book] error', err);
    res.status(500).json({ message: 'Failed to book trainer slot' });
  }
});

// POST /api/trainers/availability/:id/cancel
trainersRoutes.post('/availability/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.userId as number;
  const availId = Number(req.params.id);
  if (isNaN(availId)) return res.status(400).json({ message: 'Invalid availability id' });
  try {
    const r = await query<any>('SELECT starts_at FROM trainer_availability WHERE id = $1', [availId]);
    const a = r.rows[0];
    if (!a) return res.status(404).json({ message: 'Slot not found' });
    if (new Date(a.starts_at) < new Date()) return res.status(400).json({ message: 'Cannot cancel past slot' });
    await query("UPDATE trainer_bookings SET status='canceled' WHERE user_id = $1 AND availability_id = $2 AND status='booked'", [userId, availId]);
    res.json({ message: 'Canceled trainer slot' });
  } catch (err) {
    console.error('[availability/:id/cancel] error', err);
    res.status(500).json({ message: 'Failed to cancel trainer slot' });
  }
});

export default trainersRoutes;
