import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import pool from '../db';

const router = Router();
router.use(authenticate);

// GET /api/available-staff?ringId=&type=&when=
// Returns every staff member whose availability window has not yet ended, i.e.
// both those who are free right now and those who become free later. `when`
// narrows this to 'current' or 'upcoming'; the default 'all' returns both.
// Foreign rings' personal data (first/last name) is masked – per the spec only
// Kürzel, Wohnort, Std./Tag, Ring, Einsatzleitung, Telefon, Email and the free
// period may be shown for other rings.
router.get('/', async (req: AuthRequest, res: Response) => {
  const myRingId = req.user!.ringId;
  const { ringId, type, when } = req.query;
  try {
    let sql = `
      SELECT s.id, s.abbreviation, s.town, s.lat, s.lng, s.type, s.gender,
             s.hours_per_day, s.first_name, s.last_name, s.supervisor,
             s.phone, s.email, s.ring_id,
             r.name AS ring_name, r.website AS ring_website,
             a.start_date, a.end_date,
             (a.start_date <= (now() AT TIME ZONE 'Europe/Berlin')::date) AS is_current
      FROM staff s
      JOIN availabilities a ON s.id = a.staff_id
      JOIN rings r ON s.ring_id = r.id
      WHERE a.end_date >= (now() AT TIME ZONE 'Europe/Berlin')::date
    `;
    const params: any[] = [];
    let paramCount = 1;
    if (when === 'current') {
      sql += ` AND a.start_date <= (now() AT TIME ZONE 'Europe/Berlin')::date`;
    } else if (when === 'upcoming') {
      sql += ` AND a.start_date > (now() AT TIME ZONE 'Europe/Berlin')::date`;
    }
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
    sql += ' ORDER BY a.start_date, r.name, s.last_name';

    const result = await pool.query(sql, params);
    const masked = result.rows.map(row => {
      const isOwn = row.ring_id === myRingId;
      return {
        id: row.id,
        abbreviation: row.abbreviation,
        town: row.town,
        lat: row.lat,
        lng: row.lng,
        type: row.type,
        gender: row.gender,
        hours_per_day: Number(row.hours_per_day),
        ring_id: row.ring_id,
        ring_name: row.ring_name,
        ring_website: row.ring_website,
        supervisor: row.supervisor,
        phone: row.phone,
        email: row.email,
        start_date: row.start_date,
        end_date: row.end_date,
        is_current: row.is_current,
        is_own_ring: isOwn,
        first_name: isOwn ? row.first_name : undefined,
        last_name: isOwn ? row.last_name : undefined,
      };
    });
    res.json(masked);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch available staff' });
  }
});

export default router;
