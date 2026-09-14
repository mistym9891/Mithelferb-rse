import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../db';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requireAdmin, requireSuperAdmin, isSuperAdmin, mayActForRing } from '../middleware/role';
import { audit, toAdminsOfRing } from '../services/notify';

const router = Router();
router.use(authenticate, requireAdmin);

function generatePassword(length = 12): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

const USER_FIELDS = `u.id, u.email, u.name, u.phone, u.role, u.ring_id, u.active,
                     u.must_change_password, u.last_login_at, u.created_at,
                     u.terms_accepted_at, u.privacy_accepted_at, r.name AS ring_name`;

// GET /api/admin/users – Ring-Admins sehen den eigenen Ring, Super-Admins alle
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const all = isSuperAdmin(req);
    const result = await pool.query(
      `SELECT ${USER_FIELDS}
       FROM users u JOIN rings r ON r.id = u.ring_id
       ${all ? '' : 'WHERE u.ring_id = $1'}
       ORDER BY r.name, u.name NULLS LAST, u.email`,
      all ? [] : [req.user!.ringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Benutzer konnten nicht geladen werden' });
  }
});

// POST /api/admin/users – neuen Benutzer anlegen
router.post('/users', async (req: AuthRequest, res: Response) => {
  const { email, name, phone, role, ringId } = req.body;
  const targetRing = isSuperAdmin(req) ? (ringId ?? req.user!.ringId) : req.user!.ringId;

  if (!email || !name) {
    return res.status(400).json({ error: 'Name und E-Mail-Adresse sind erforderlich' });
  }
  const wanted = role || 'member';
  // Nur der Super-Admin darf weitere Super-Admins ernennen.
  if (wanted === 'super_admin' && !isSuperAdmin(req)) {
    return res.status(403).json({ error: 'Nur der Super-Administrator darf diese Rolle vergeben' });
  }
  if (!['super_admin', 'ring_admin', 'member'].includes(wanted)) {
    return res.status(400).json({ error: 'Unbekannte Rolle' });
  }
  if (!mayActForRing(req, targetRing)) {
    return res.status(403).json({ error: 'Keine Berechtigung für diesen Ring' });
  }

  try {
    const password = generatePassword();
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, phone, ring_id, role, must_change_password, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)
       RETURNING id`,
      [email.trim(), await bcrypt.hash(password, 10), name.trim(), phone || null,
       targetRing, wanted, req.user!.userId]
    );
    await audit(req.user!.userId, 'user.create', `user:${result.rows[0].id}`, { email, role: wanted, ringId: targetRing });

    // Das Startpasswort wird genau einmal angezeigt und persönlich übergeben.
    res.status(201).json({
      id: result.rows[0].id,
      initialPassword: password,
      hint: 'Bitte persönlich übergeben. Es muss bei der ersten Anmeldung geändert werden.',
    });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Diese E-Mail-Adresse wird bereits verwendet' });
    }
    console.error(err);
    res.status(500).json({ error: 'Benutzer konnte nicht angelegt werden' });
  }
});

const EDITABLE = ['name', 'phone', 'email', 'role', 'active'];

// PUT /api/admin/users/:id
router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const cur = await pool.query('SELECT id, ring_id, role FROM users WHERE id = $1', [id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    if (!mayActForRing(req, cur.rows[0].ring_id)) {
      return res.status(403).json({ error: 'Keine Berechtigung für diesen Ring' });
    }

    const updates = req.body || {};
    const fields = Object.keys(updates).filter(k => EDITABLE.includes(k));
    if (fields.length === 0) return res.status(400).json({ error: 'Keine änderbaren Felder übergeben' });

    if (fields.includes('role')) {
      if (!isSuperAdmin(req) && (updates.role === 'super_admin' || cur.rows[0].role === 'super_admin')) {
        return res.status(403).json({ error: 'Die Rolle des Super-Administrators darf nur er selbst ändern' });
      }
      if (!['super_admin', 'ring_admin', 'member'].includes(updates.role)) {
        return res.status(400).json({ error: 'Unbekannte Rolle' });
      }
    }
    // Sich selbst nicht die Rechte entziehen oder das eigene Konto sperren.
    if (id === req.user!.userId && (fields.includes('role') || updates.active === false)) {
      return res.status(400).json({ error: 'Das eigene Konto kann nicht herabgestuft oder gesperrt werden' });
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = [id, ...fields.map(f => updates[f])];
    const result = await pool.query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING id`, values
    );
    await audit(req.user!.userId, 'user.update', `user:${id}`, updates);
    res.json({ success: true, id: result.rows[0].id });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Diese E-Mail-Adresse wird bereits verwendet' });
    }
    console.error(err);
    res.status(500).json({ error: 'Änderung fehlgeschlagen' });
  }
});

// POST /api/admin/users/:id/reset-password – direkt zurücksetzen
router.post('/users/:id/reset-password', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const cur = await pool.query('SELECT id, name, email, ring_id FROM users WHERE id = $1', [id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    if (!mayActForRing(req, cur.rows[0].ring_id)) {
      return res.status(403).json({ error: 'Keine Berechtigung für diesen Ring' });
    }

    const password = generatePassword();
    await pool.query(
      'UPDATE users SET password_hash = $2, must_change_password = TRUE WHERE id = $1',
      [id, await bcrypt.hash(password, 10)]
    );
    await pool.query(
      `UPDATE password_reset_requests SET handled_at = now(), handled_by = $2
       WHERE user_id = $1 AND handled_at IS NULL AND cancelled_at IS NULL`,
      [id, req.user!.userId]
    );
    await audit(req.user!.userId, 'password.reset_direct', `user:${id}`);

    res.json({
      success: true,
      userName: cur.rows[0].name,
      newPassword: password,
      hint: 'Bitte persönlich übergeben. Es muss bei der ersten Anmeldung geändert werden.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Zurücksetzen fehlgeschlagen' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (id === req.user!.userId) {
    return res.status(400).json({ error: 'Das eigene Konto kann nicht gelöscht werden' });
  }
  try {
    const cur = await pool.query('SELECT ring_id, role FROM users WHERE id = $1', [id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    if (!mayActForRing(req, cur.rows[0].ring_id)) {
      return res.status(403).json({ error: 'Keine Berechtigung für diesen Ring' });
    }
    if (cur.rows[0].role === 'super_admin' && !isSuperAdmin(req)) {
      return res.status(403).json({ error: 'Ein Super-Administrator kann nur von einem Super-Administrator gelöscht werden' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    await audit(req.user!.userId, 'user.delete', `user:${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Löschen fehlgeschlagen' });
  }
});

// GET /api/admin/reset-requests – offene Passwortanfragen
router.get('/reset-requests', async (req: AuthRequest, res: Response) => {
  try {
    const all = isSuperAdmin(req);
    const result = await pool.query(
      `SELECT p.token, p.requested_at, p.expires_at,
              u.name AS user_name, u.email AS user_email, r.name AS ring_name
       FROM password_reset_requests p
       JOIN users u ON u.id = p.user_id
       JOIN rings r ON r.id = u.ring_id
       WHERE p.handled_at IS NULL AND p.cancelled_at IS NULL AND p.expires_at > now()
         ${all ? '' : 'AND u.ring_id = $1'}
       ORDER BY p.requested_at DESC`,
      all ? [] : [req.user!.ringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Anfragen konnten nicht geladen werden' });
  }
});

// GET /api/admin/audit – nur Super-Admin (IT-/Administrationsaufsicht)
router.get('/audit', requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.action, a.target, a.detail, a.created_at, u.name AS actor_name, u.email AS actor_email
       FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Protokoll konnte nicht geladen werden' });
  }
});

export default router;
