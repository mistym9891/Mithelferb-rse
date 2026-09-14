import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import pool from '../db';

const router = Router();
router.use(authenticate);

// GET /api/available-staff – with query params: ringId (optional), type (optional)
router.get('/', async (req: AuthRequest, res: Response) => {
  const myRingId = req.user!.ringId;
  const { ringId, type } = req.query;
  try {
    let sql = `
      SELECT s.id, s.abbreviation, s.town, s.type, s.hours_per_day, 
             s.first_name, s.last_name, s.phone, s.email, s.ring_id,
             r.name as ring_name,
             a.start_date, a.end_date
      FROM staff s
      JOIN availabilities a ON s.id = a.staff_id
      JOIN rings r ON s.ring_id = r.id
      WHERE a.start_date <= CURRENT_DATE AND a.end_date >= CURRENT_DATE
    `;
    const params: any[] = [];
    let paramCount = 1;
    if (ringId) {
      sql += ` AND s.ring_id = $${paramCount}`;
      params.push(ringId);
      paramCount++;
    }
    if (type) {
      sql += ` AND s.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }
    sql += ` ORDER BY s.ring_id, s.last_name`;
    const result = await pool.query(sql, params);
    // Now mask data for foreign rings
    const masked = result.rows.map(row => {
      const isOwn = row.ring_id === myRingId;
      return {
        id: row.id,
        abbreviation: row.abbreviation,
        town: row.town,
        type: row.type,
        hours_per_day: row.hours_per_day,
        ring_name: row.ring_name,
        start_date: row.start_date,
        end_date: row.end_date,
        // Only show full details if own ring
        first_name: isOwn ? row.first_name : undefined,
        last_name: isOwn ? row.last_name : undefined,
        phone: isOwn ? row.phone : undefined,
        email: isOwn ? row.email : undefined,
      };
    });
    res.json(masked);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch available staff' });
  }
});

export default router;