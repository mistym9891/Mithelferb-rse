import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authenticate } from '../middleware/auth';
import { getPublicKey, pushConfigured, sendToAll } from '../services/push';

const router = Router();

// Öffentlicher Schlüssel – der Browser braucht ihn zum Anmelden beim Push-Dienst.
router.get('/key', (_req, res) => {
  res.json({ publicKey: getPublicKey(), enabled: pushConfigured() });
});

router.use(authenticate);

// Gerät für Benachrichtigungen anmelden
router.post('/subscribe', async (req: AuthRequest, res: Response) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Ungültige Anmeldedaten für Push' });
  }
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (endpoint) DO UPDATE SET
         user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent`,
      [req.user!.userId, endpoint, keys.p256dh, keys.auth, req.headers['user-agent'] ?? null]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Anmeldung für Benachrichtigungen fehlgeschlagen' });
  }
});

router.delete('/subscribe', async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body || {};
  try {
    if (endpoint) {
      await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    } else {
      await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [req.user!.userId]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Abmeldung fehlgeschlagen' });
  }
});

// Wie viele Geräte dieses Kontos sind angemeldet?
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const r = await pool.query(
      'SELECT COUNT(*)::int AS devices FROM push_subscriptions WHERE user_id = $1',
      [req.user!.userId]
    );
    res.json({ enabled: pushConfigured(), devices: r.rows[0].devices });
  } catch {
    res.json({ enabled: pushConfigured(), devices: 0 });
  }
});

// Testmeldung an die eigenen Geräte
router.post('/test', async (req: AuthRequest, res: Response) => {
  const subs = await pool.query(
    'SELECT COUNT(*)::int AS n FROM push_subscriptions WHERE user_id = $1', [req.user!.userId]
  );
  if (subs.rows[0].n === 0) {
    return res.status(400).json({ error: 'Für dieses Konto ist noch kein Gerät angemeldet' });
  }
  // sendToAll mit "except" invertiert: hier gezielt nur die eigenen Geräte.
  const own = await pool.query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1', [req.user!.userId]
  );
  const webpush = require('web-push');
  let sent = 0;
  for (const s of own.rows) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({
          title: 'Mithelferbörse – Testmeldung',
          body: 'Benachrichtigungen funktionieren auf diesem Gerät.',
          tag: 'test',
        })
      );
      sent++;
    } catch (err: any) {
      console.error('Testmeldung fehlgeschlagen:', err.statusCode);
    }
  }
  res.json({ success: sent > 0, sent });
});

export default router;
