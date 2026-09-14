import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import pool from '../db';
import { Server } from 'socket.io';

// We'll pass the io instance later – we'll use a global variable or export a function.
let io: Server | null = null;
export const setIo = (socketIo: Server) => { io = socketIo; };

const router = Router();
router.use(authenticate);

// POST /api/staff/:id/availability – mark available
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
    // Verify staff belongs to this ring
    const staffCheck = await pool.query('SELECT id, abbreviation, town, type, hours_per_day, ring_id FROM staff WHERE id = $1', [staffId]);
    if (staffCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    if (staffCheck.rows[0].ring_id !== ringId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Insert availability (we allow only one active per staff; delete previous if any)
    await pool.query('DELETE FROM availabilities WHERE staff_id = $1', [staffId]);
    const result = await pool.query(
      'INSERT INTO availabilities (staff_id, start_date, end_date) VALUES ($1, $2, $3) RETURNING *',
      [staffId, start_date, end_date]
    );

    // Emit real-time event
    if (io) {
      const staff = staffCheck.rows[0];
      const ringNameResult = await pool.query('SELECT name FROM rings WHERE id = $1', [ringId]);
      const ringName = ringNameResult.rows[0]?.name || 'Unknown';
      const eventData = {
        staffId: staff.id,
        abbreviation: staff.abbreviation,
        town: staff.town,
        hours_per_day: staff.hours_per_day,
        type: staff.type,
        ringName,
        start_date,
        end_date,
      };
      io.emit('newAvailability', eventData);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to set availability' });
  }
});

// DELETE /api/staff/:id/availability – remove availability
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
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove availability' });
  }
});

export default router;