import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db';
import { AuthRequest, authenticate } from '../middleware/auth';
import { TERMS_TEXT, PRIVACY_TEXT, TERMS_VERSION, PRIVACY_VERSION } from '../config/legal';
import { toAdminsOfRing, audit } from '../services/notify';
import { sendMail, mailConfigured } from '../services/mail';

const router = Router();

const RESET_VALID_HOURS = 48;

/** Erzeugt ein gut lesbares Zufallspasswort (keine verwechselbaren Zeichen). */
function generatePassword(length = 12): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

function signToken(user: any) {
  return jwt.sign(
    { userId: user.id, ringId: user.ring_id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
}

function publicUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    ringId: user.ring_id,
    role: user.role,
    name: user.name,
    ringName: user.ring_name,
    mustChangePassword: user.must_change_password,
    // Zustimmung gilt nur für die jeweils aktuelle Fassung – ändert sich der
    // Text, wird sie erneut eingeholt.
    termsAccepted: user.terms_accepted_at != null && user.terms_version === TERMS_VERSION,
    privacyAccepted: user.privacy_accepted_at != null && user.privacy_version === PRIVACY_VERSION,
  };
}

// ---------------------------------------------------------------- Rechtstexte

// Öffentlich abrufbar – die Texte müssen vor der Zustimmung lesbar sein.
router.get('/legal', (_req: Request, res: Response) => {
  res.json({
    terms: { version: TERMS_VERSION, text: TERMS_TEXT },
    privacy: { version: PRIVACY_VERSION, text: PRIVACY_TEXT },
  });
});

// ------------------------------------------------------------------ Anmeldung

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
  }
  try {
    const result = await pool.query(
      `SELECT u.*, r.name AS ring_name
       FROM users u JOIN rings r ON u.ring_id = r.id
       WHERE lower(u.email) = lower($1)`,
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'E-Mail-Adresse oder Passwort ist falsch' });
    }
    const user = result.rows[0];

    if (!user.active) {
      return res.status(403).json({ error: 'Dieses Konto ist deaktiviert. Bitte an die Ringverwaltung wenden.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'E-Mail-Adresse oder Passwort ist falsch' });
    }

    await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Anmeldung fehlgeschlagen' });
  }
});

/** Aktuelle Benutzerdaten – der Client prüft damit beim Start seinen Stand. */
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.*, r.name AS ring_name
       FROM users u JOIN rings r ON u.ring_id = r.id
       WHERE u.id = $1`,
      [req.user!.userId]
    );
    if (result.rows.length === 0 || !result.rows[0].active) {
      return res.status(401).json({ error: 'Konto nicht mehr gültig' });
    }
    res.json({ user: publicUser(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Abruf fehlgeschlagen' });
  }
});

// ------------------------------------------------------- Zustimmung / Passwort

router.post('/accept-legal', authenticate, async (req: AuthRequest, res: Response) => {
  const { terms, privacy } = req.body;
  if (!terms || !privacy) {
    return res.status(400).json({ error: 'Beiden Texten muss zugestimmt werden' });
  }
  try {
    await pool.query(
      `UPDATE users SET
         terms_accepted_at = now(), terms_version = $2,
         privacy_accepted_at = now(), privacy_version = $3
       WHERE id = $1`,
      [req.user!.userId, TERMS_VERSION, PRIVACY_VERSION]
    );
    await audit(req.user!.userId, 'legal.accept', `user:${req.user!.userId}`, {
      terms: TERMS_VERSION, privacy: PRIVACY_VERSION,
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Zustimmung konnte nicht gespeichert werden' });
  }
});

router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 10) {
    return res.status(400).json({ error: 'Das neue Passwort muss mindestens 10 Zeichen haben' });
  }
  try {
    const r = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user!.userId]);
    const ok = await bcrypt.compare(currentPassword || '', r.rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Das aktuelle Passwort ist falsch' });

    await pool.query(
      'UPDATE users SET password_hash = $2, must_change_password = FALSE WHERE id = $1',
      [req.user!.userId, await bcrypt.hash(newPassword, 10)]
    );
    await audit(req.user!.userId, 'password.change', `user:${req.user!.userId}`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Passwortänderung fehlgeschlagen' });
  }
});

// ----------------------------------------------- Passwort vergessen (über Admin)

/**
 * Der Benutzer fordert ein neues Passwort an. Es wird KEIN Link an den Benutzer
 * geschickt – stattdessen erhalten die Ring-Administratoren (und der
 * Super-Admin) einen Link, über den sie ein neues Passwort erzeugen und es dem
 * Benutzer persönlich übergeben.
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  // Antwort ist immer gleich, damit nicht geprüft werden kann, welche
  // Adressen existieren.
  const genericAnswer = {
    success: true,
    message: 'Ihre Anfrage wurde an die Ringverwaltung weitergeleitet. '
           + 'Sie erhalten das neue Passwort persönlich von Ihrer Einsatzleitung.',
  };
  if (!email) return res.json(genericAnswer);

  try {
    const r = await pool.query(
      `SELECT u.id, u.email, u.name, u.ring_id, r.name AS ring_name
       FROM users u JOIN rings r ON u.ring_id = r.id
       WHERE lower(u.email) = lower($1) AND u.active`,
      [email]
    );
    if (r.rows.length === 0) return res.json(genericAnswer);
    const user = r.rows[0];

    // Offene Anfragen desselben Benutzers ersetzen.
    await pool.query(
      `UPDATE password_reset_requests SET cancelled_at = now()
       WHERE user_id = $1 AND handled_at IS NULL AND cancelled_at IS NULL`,
      [user.id]
    );

    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO password_reset_requests (user_id, token, expires_at)
       VALUES ($1, $2, now() + ($3 || ' hours')::interval)`,
      [user.id, token, RESET_VALID_HOURS]
    );

    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const link = `${baseUrl}/passwort-zuruecksetzen/${token}`;

    // Zuständige Administratoren ermitteln
    const admins = await pool.query(
      `SELECT email, name FROM users
       WHERE active AND (role = 'super_admin' OR (role = 'ring_admin' AND ring_id = $1))`,
      [user.ring_id]
    );

    // Echtzeit-Hinweis in der App
    toAdminsOfRing(user.ring_id, 'passwordResetRequested', {
      userName: user.name,
      userEmail: user.email,
      ringName: user.ring_name,
      requestedAt: new Date().toISOString(),
    });

    // Zusätzlich per E-Mail, sofern SMTP eingerichtet ist
    if (admins.rows.length > 0) {
      await sendMail({
        to: admins.rows.map(a => a.email),
        subject: `Mithelferbörse: Passwortanfrage von ${user.name || user.email}`,
        text:
          `${user.name || user.email} (${user.ring_name}) hat ein neues Passwort angefordert.\n\n` +
          `Über folgenden Link erzeugen Sie ein neues Passwort und geben es der Person persönlich weiter:\n\n` +
          `${link}\n\n` +
          `Der Link ist ${RESET_VALID_HOURS} Stunden gültig und kann nur einmal verwendet werden.\n` +
          `Sie können die Anfrage auch in der App unter „Verwaltung“ bearbeiten.\n`,
      });
    }

    await audit(user.id, 'password.reset_requested', `user:${user.id}`, {
      mailConfigured: mailConfigured(), admins: admins.rows.length,
    });

    res.json(genericAnswer);
  } catch (err) {
    console.error(err);
    res.json(genericAnswer);
  }
});

/** Der Administrator öffnet den Link und sieht, um wen es geht. */
router.get('/reset-request/:token', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const r = await pool.query(
      `SELECT p.id, p.expires_at, p.handled_at, p.cancelled_at,
              u.id AS user_id, u.name, u.email, u.ring_id, r.name AS ring_name
       FROM password_reset_requests p
       JOIN users u ON u.id = p.user_id
       JOIN rings r ON r.id = u.ring_id
       WHERE p.token = $1`,
      [req.params.token]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Anfrage nicht gefunden' });
    const q = r.rows[0];

    if (req.user!.role !== 'super_admin' &&
        !(req.user!.role === 'ring_admin' && req.user!.ringId === q.ring_id)) {
      return res.status(403).json({ error: 'Nur die Verwaltung des betroffenen Rings darf das bearbeiten' });
    }

    res.json({
      request: {
        userName: q.name, userEmail: q.email, ringName: q.ring_name,
        expiresAt: q.expires_at,
        handled: q.handled_at != null,
        cancelled: q.cancelled_at != null,
        expired: new Date(q.expires_at) < new Date(),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Abruf fehlgeschlagen' });
  }
});

/** Der Administrator erzeugt das neue Passwort – es wird genau einmal angezeigt. */
router.post('/reset-request/:token/generate', authenticate, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `SELECT p.id, p.expires_at, p.handled_at, p.cancelled_at, u.id AS user_id, u.name, u.email, u.ring_id
       FROM password_reset_requests p JOIN users u ON u.id = p.user_id
       WHERE p.token = $1 FOR UPDATE`,
      [req.params.token]
    );
    if (r.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Anfrage nicht gefunden' });
    }
    const q = r.rows[0];

    if (req.user!.role !== 'super_admin' &&
        !(req.user!.role === 'ring_admin' && req.user!.ringId === q.ring_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Keine Berechtigung für diesen Ring' });
    }
    if (q.handled_at) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Diese Anfrage wurde bereits bearbeitet' });
    }
    if (q.cancelled_at || new Date(q.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(410).json({ error: 'Die Anfrage ist abgelaufen oder wurde zurückgezogen' });
    }

    const newPassword = generatePassword();
    await client.query(
      'UPDATE users SET password_hash = $2, must_change_password = TRUE WHERE id = $1',
      [q.user_id, await bcrypt.hash(newPassword, 10)]
    );
    await client.query(
      'UPDATE password_reset_requests SET handled_at = now(), handled_by = $2 WHERE id = $1',
      [q.id, req.user!.userId]
    );
    await client.query('COMMIT');

    await audit(req.user!.userId, 'password.reset_generated', `user:${q.user_id}`);

    res.json({
      success: true,
      userName: q.name,
      userEmail: q.email,
      newPassword,
      hint: 'Bitte persönlich übergeben. Die Person muss das Passwort bei der ersten Anmeldung ändern.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Passwort konnte nicht erzeugt werden' });
  } finally {
    client.release();
  }
});

export default router;
