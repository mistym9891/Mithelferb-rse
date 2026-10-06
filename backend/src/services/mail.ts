import nodemailer, { Transporter } from 'nodemailer';

/**
 * E-Mail-Versand für Administrations-Benachrichtigungen.
 *
 * Ist kein SMTP-Server konfiguriert (SMTP_HOST fehlt), läuft die Anwendung
 * trotzdem vollständig: Die Nachricht wird protokolliert und die zuständigen
 * Administratoren sehen die Anfrage in der App (Echtzeit-Hinweis + Liste).
 * So ist der Betrieb nie von der Mailkonfiguration abhängig.
 */

let transporter: Transporter | null = null;
let configured = false;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  configured = true;
}

export const mailConfigured = () => configured;

/**
 * `bcc` ist für Empfänger gedacht, die die übrigen Empfänger nicht kennen
 * sollen – konkret die Super-Administration: sie wird bei Passwortanfragen
 * mitbenachrichtigt, ihre Adresse darf aber nicht im Kopf einer Mail an
 * Ring-Administratoren stehen.
 */
export async function sendMail(opts: {
  to: string | string[];
  bcc?: string | string[];
  subject: string;
  text: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const to = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to;
  const bcc = Array.isArray(opts.bcc) ? opts.bcc.join(', ') : opts.bcc;

  if (!transporter) {
    console.log(
      `[Mail nicht konfiguriert] An: ${to}` +
      `${bcc ? ` (+${bcc.split(',').length} verdeckt)` : ''}` +
      `\nBetreff: ${opts.subject}\n${opts.text}\n`
    );
    return { sent: false, reason: 'SMTP nicht konfiguriert' };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'BHD-Regionalplan <noreply@localhost>',
      to,
      ...(bcc ? { bcc } : {}),
      subject: opts.subject,
      text: opts.text,
    });
    return { sent: true };
  } catch (err: any) {
    console.error('E-Mail-Versand fehlgeschlagen:', err.message);
    return { sent: false, reason: err.message };
  }
}
