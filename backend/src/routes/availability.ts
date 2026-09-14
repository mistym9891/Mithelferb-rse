import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import pool from '../db';
import { broadcast, audit } from '../services/notify';
import { sendToAll } from '../services/push';

const router = Router();
router.use(authenticate);

// POST /api/staff/:staffId/availability – mark available
router.post('/:staffId/availability', async (req: AuthRequest, res: Response) => {
  const staffId = parseInt(req.params.staffId);
  const ringId = req.user!.ringId;
  const { start_date, end_date } = req.body;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Start and end dates required' });
  }
  if (new Date(start_date) > new Date(end_date)) {
    return res.status(400).json({ error: 'End date must be after start date' });
  }

  try {
    const staffCheck = await pool.query(
      'SELECT id, abbreviation, town, lat, lng, type, gender, hours_per_day, ring_id FROM staff WHERE id = $1',
      [staffId]
    );
    if (staffCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    if (staffCheck.rows[0].ring_id !== ringId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Only one active availability window per staff member.
    await pool.query('DELETE FROM availabilities WHERE staff_id = $1', [staffId]);
    const result = await pool.query(
      'INSERT INTO availabilities (staff_id, start_date, end_date) VALUES ($1, $2, $3) RETURNING *',
      [staffId, start_date, end_date]
    );

    const staff = staffCheck.rows[0];
    const ringNameResult = await pool.query('SELECT name FROM rings WHERE id = $1', [ringId]);
    const ringName = ringNameResult.rows[0]?.name || 'Unbekannt';
    // Alle angemeldeten Ringe erfahren sofort von der Freimeldung.
    broadcast('newAvailability', {
      staffId: staff.id,
      abbreviation: staff.abbreviation,
      town: staff.town,
      hours_per_day: staff.hours_per_day,
      type: staff.type,
      gender: staff.gender,
      ringName,
      start_date,
      end_date,
    });
    await audit(req.user!.userId, 'availability.set', `staff:${staffId}`, { start_date, end_date });

    // Zusätzlich als Push-Meldung – erreicht auch Geräte, auf denen die App
    // gerade nicht geöffnet ist. Die auslösende Person bekommt sie nicht.
    const von = new Date(start_date).toLocaleDateString('de-DE');
    const bis = new Date(end_date).toLocaleDateString('de-DE');
    sendToAll({
      title: `${staff.abbreviation} ist frei (${ringName})`,
      body: `${von} – ${bis} · ${staff.hours_per_day} Std./Tag · ` +
            `${staff.type === 'agricultural' ? 'landwirtschaftlich' : 'städtisch'} · ${staff.town}`,
      tag: `avail-${staffId}`,
      url: '/dashboard',
    }, req.user!.userId).catch(err => console.error('Push-Versand:', err));

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to set availability' });
  }
});

// DELETE /api/staff/:staffId/availability – remove availability
router.delete('/:staffId/availability', async (req: AuthRequest, res: Response) => {
  const staffId = parseInt(req.params.staffId);
  const ringId = req.user!.ringId;
  try {
    const staffCheck = await pool.query('SELECT ring_id FROM staff WHERE id = $1', [staffId]);
    if (staffCheck.rows.length === 0) return res.status(404).json({ error: 'Staff not found' });
    if (staffCheck.rows[0].ring_id !== ringId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await pool.query('DELETE FROM availabilities WHERE staff_id = $1', [staffId]);
    broadcast('availabilityRemoved', { staffId });
    await audit(req.user!.userId, 'availability.clear', `staff:${staffId}`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove availability' });
  }
});

export default router;
