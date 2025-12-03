import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { query } from '../db';

const adminRoutes = Router();

// GET /api/admin/classes - List all group classes
adminRoutes.get('/classes', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT id, title, blurb, created_at, updated_at
      FROM group_classes
      ORDER BY title ASC
    `);
    res.json({ classes: result.rows });
  } catch (err) {
    console.error('[admin/classes GET] error', err);
    res.status(500).json({ message: 'Failed to load classes' });
  }
});

// POST /api/admin/classes - Create a new group class
adminRoutes.post('/classes', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { title, blurb } = req.body as { title?: string; blurb?: string };
  
  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Title is required' });
  }

  try {
    const result = await query(
      `INSERT INTO group_classes (title, blurb)
       VALUES ($1, $2)
       RETURNING id, title, blurb, created_at, updated_at`,
      [title.trim(), blurb?.trim() || null]
    );
    res.status(201).json({ class: result.rows[0] });
  } catch (err) {
    console.error('[admin/classes POST] error', err);
    res.status(500).json({ message: 'Failed to create class' });
  }
});

// PUT /api/admin/classes/:id - Update a group class
adminRoutes.put('/classes/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const classId = parseInt(req.params.id, 10);
  if (isNaN(classId)) {
    return res.status(400).json({ message: 'Invalid class ID' });
  }

  const { title, blurb } = req.body as { title?: string; blurb?: string };
  
  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Title is required' });
  }

  try {
    const result = await query(
      `UPDATE group_classes
       SET title = $1, blurb = $2, updated_at = now()
       WHERE id = $3
       RETURNING id, title, blurb, created_at, updated_at`,
      [title.trim(), blurb?.trim() || null, classId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json({ class: result.rows[0] });
  } catch (err) {
    console.error('[admin/classes PUT] error', err);
    res.status(500).json({ message: 'Failed to update class' });
  }
});

// DELETE /api/admin/classes/:id - Delete a group class
adminRoutes.delete('/classes/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const classId = parseInt(req.params.id, 10);
  if (isNaN(classId)) {
    return res.status(400).json({ message: 'Invalid class ID' });
  }

  try {
    // Check if there are any sessions for this class
    const sessionsCheck = await query(
      'SELECT COUNT(*) as count FROM class_sessions WHERE class_id = $1',
      [classId]
    );
    
    const sessionCount = parseInt(sessionsCheck.rows[0]?.count || '0', 10);
    if (sessionCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete class with ${sessionCount} scheduled session(s). Delete sessions first.` 
      });
    }

    const result = await query(
      'DELETE FROM group_classes WHERE id = $1 RETURNING id',
      [classId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json({ message: 'Class deleted successfully' });
  } catch (err) {
    console.error('[admin/classes DELETE] error', err);
    res.status(500).json({ message: 'Failed to delete class' });
  }
});

export default adminRoutes;
