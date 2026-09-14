import webpush from 'web-push';
import pool from '../db';

/**
 * Web-Push-Benachrichtigungen.
 *
 * Die Pop-up-Meldung in der App erreicht nur, wer die App gerade offen hat.
 * Für Freimeldungen ist das zu wenig – die Einsatzleitung sitzt nicht den
 * ganzen Tag vor der Karte. Über Web Push kommt die Meldung auch an, wenn die
 * App im Hintergrund läuft oder geschlossen ist.
 *
 * Voraussetzungen: HTTPS (Ausnahme localhost) und – auf iOS – eine zum
 * Startbildschirm hinzugefügte App (ab iOS 16.4).
 */

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@localhost';

let configured = false;
if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
} else {
  console.warn('VAPID-Schlüssel fehlen – Push-Benachrichtigungen sind deaktiviert.');
}

export const pushConfigured = () => configured;
export const getPublicKey = () => publicKey ?? null;

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

/**
 * Verschickt eine Meldung an alle angemeldeten Geräte – außer an die Person,
 * die die Änderung selbst ausgelöst hat.
 */
export async function sendToAll(payload: PushPayload, exceptUserId?: number) {
  if (!configured) return { sent: 0, removed: 0 };

  const subs = await pool.query(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions
     ${exceptUserId ? 'WHERE user_id <> $1' : ''}`,
    exceptUserId ? [exceptUserId] : []
  );

  let sent = 0;
  const dead: number[] = [];

  await Promise.all(subs.rows.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 12 * 3600 }
      );
      sent++;
    } catch (err: any) {
      // 404/410 = Abo beim Push-Dienst abgelaufen -> aufräumen.
      if (err.statusCode === 404 || err.statusCode === 410) {
        dead.push(s.id);
      } else {
        console.error('Push fehlgeschlagen:', err.statusCode, err.body?.slice?.(0, 120) ?? err.message);
      }
    }
  }));

  if (dead.length) {
    await pool.query('DELETE FROM push_subscriptions WHERE id = ANY($1)', [dead]);
  }
  if (sent) {
    await pool.query(
      `UPDATE push_subscriptions SET last_used_at = now()
       ${exceptUserId ? 'WHERE user_id <> $1' : ''}`,
      exceptUserId ? [exceptUserId] : []
    );
  }
  return { sent, removed: dead.length };
}
