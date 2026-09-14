import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import pool from '../db';

const router = Router();
router.use(authenticate);

// GET /api/staff – list own ring’s staff (with active availability if any)
router.get('/', async (req: AuthRequest, res: Response) => {
  const ringId = req.user!.ringId;
  try {
    const query = `
      SELECT s.*, 
             a.id as availability_id, a.start_date, a.end_date
      FROM staff s
      LEFT JOIN availabilities a ON s.id = a.staff_id
      WHERE s.ring_id = $1
      ORDER BY s.last_name
    `;
    const result = await pool.query(query, [ringId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// POST /api/staff – create new staff (own ring)
router.post('/', async (req: AuthRequest, res: Response) => {
  const ringId = req.user!.ringId;
  const { first_name, last_name, abbreviation, town, type, hours_per_day, phone, email } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO staff (first_name, last_name, abbreviation, town, type, hours_per_day, phone, email, ring_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [first_name, last_name, abbreviation, town, type, hours_per_day, phone, email, ringId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

// PUT /api/staff/:id – update (only if ring matches)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const staffId = parseInt(req.params.id);
  const ringId = req.user!.ringId;
  const updates = req.body;
  // Build dynamic SET clause
  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'ring_id');
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  const setClause = fields.map((f, i) => `${f} = $${i+1}`).join(', ');
  const values = fields.map(f => updates[f]);
  values.push(staffId, ringId);
  try {
    const result = await pool.query(
      `UPDATE staff SET ${setClause} 
       WHERE id = $${values.length-1} AND ring_id = $${values.length}
       RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff not found or not owned' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /api/staff/:id – delete (own ring)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const staffId = parseInt(req.params.id);
  const ringId = req.user!.ringId;
  try {
    const result = await pool.query(
      'DELETE FROM staff WHERE id = $1 AND ring_id = $2 RETURNING id',
      [staffId, ringId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff not found or not owned' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;