import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import pool from '../db';
import { geocodeTown } from '../services/geocode';
import { broadcast, audit } from '../services/notify';

const router = Router();
router.use(authenticate);

// Columns a ring admin is allowed to write. Used as an allow-list so that
// user-supplied object keys can never be interpolated into SQL.
const EDITABLE = [
  'first_name', 'last_name', 'abbreviation', 'town', 'type', 'gender',
  'hours_per_day', 'supervisor', 'phone', 'email', 'lat', 'lng',
];

// GET /api/staff – list own ring's staff (with active availability if any)
router.get('/', async (req: AuthRequest, res: Response) => {
  const ringId = req.user!.ringId;
  try {
    const result = await pool.query(
      `SELECT s.*, a.id AS availability_id, a.start_date, a.end_date
       FROM staff s
       LEFT JOIN availabilities a ON s.id = a.staff_id
       WHERE s.ring_id = $1
       ORDER BY s.last_name, s.first_name`,
      [ringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// POST /api/staff – create new staff (own ring)
router.post('/', async (req: AuthRequest, res: Response) => {
  const ringId = req.user!.ringId;
  const {
    first_name, last_name, abbreviation, town, type, gender,
    hours_per_day, supervisor, phone, email,
  } = req.body;

  if (!first_name || !last_name || !abbreviation || !town || !type) {
    return res.status(400).json({ error: 'first_name, last_name, abbreviation, town and type are required' });
  }
  if (!['agricultural', 'urban'].includes(type)) {
    return res.status(400).json({ error: "type must be 'agricultural' or 'urban'" });
  }

  try {
    // Resolve the home town to coordinates so the marker can be placed on the map.
    const coords = await geocodeTown(town);
    const result = await pool.query(
      `INSERT INTO staff
         (first_name, last_name, abbreviation, town, lat, lng, type, gender,
          hours_per_day, supervisor, phone, email, ring_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        first_name, last_name, abbreviation, town,
        coords?.lat ?? null, coords?.lng ?? null,
        type, gender || 'unknown', hours_per_day ?? 8,
        supervisor || null, phone || null, email || null, ringId,
      ]
    );
    broadcast('staffChanged', { action: 'created', ringId, staffId: result.rows[0].id });
    await audit(req.user!.userId, 'staff.create', `staff:${result.rows[0].id}`, { abbreviation });
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Abbreviation already used in this ring' });
    }
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

// PUT /api/staff/:id – update (only if ring matches)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const staffId = parseInt(req.params.id);
  const ringId = req.user!.ringId;
  const updates = req.body || {};

  const fields = Object.keys(updates).filter(k => EDITABLE.includes(k));
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No updatable fields supplied' });
  }

  const values: any[] = fields.map(f => updates[f]);

  // If the town changed but no explicit coordinates were sent, re-geocode.
  if (fields.includes('town') && !fields.includes('lat')) {
    const coords = await geocodeTown(updates.town);
    if (coords) {
      fields.push('lat', 'lng');
      values.push(coords.lat, coords.lng);
    }
  }

  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  values.push(staffId, ringId);

  try {
    const result = await pool.query(
      `UPDATE staff SET ${setClause}
       WHERE id = $${values.length - 1} AND ring_id = $${values.length}
       RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff not found or not owned' });
    }
    broadcast('staffChanged', { action: 'updated', ringId, staffId });
    await audit(req.user!.userId, 'staff.update', `staff:${staffId}`, updates);
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
    broadcast('staffChanged', { action: 'deleted', ringId, staffId });
    await audit(req.user!.userId, 'staff.delete', `staff:${staffId}`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
