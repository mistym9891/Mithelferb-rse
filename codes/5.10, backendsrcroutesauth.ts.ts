import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';

const router = Router();

// Register (super-admin only – we'll hardcode a super admin check for demo)
// In production, this endpoint should be protected.
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, ringId } = req.body;
  try {
    // Check if ring exists
    const ringCheck = await pool.query('SELECT id FROM rings WHERE id = $1', [ringId]);
    if (ringCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Ring not found' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, ring_id, role) VALUES ($1, $2, $3, $4) RETURNING id, email, ring_id',
      [email, hashed, ringId, 'ring_admin']
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, ring_id, role FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user.id, ringId: user.ring_id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, email: user.email, ringId: user.ring_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;