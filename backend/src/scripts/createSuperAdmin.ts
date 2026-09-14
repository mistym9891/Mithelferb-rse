import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import readline from 'readline';
import pool from '../db';
import { audit } from '../services/notify';

/**
 * Legt ein Super-Administrator-Konto an oder stuft ein vorhandenes hoch.
 *
 *   npm run create-superadmin -- <email> "<Name>" [Ringname]
 *
 * Das Passwort wird zufällig erzeugt und genau einmal ausgegeben. Ohne
 * Argumente wird interaktiv gefragt.
 */

function generatePassword(length = 16): string {
  // Keine verwechselbaren Zeichen (0/O, 1/l/I) – das Passwort wird abgetippt.
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a.trim()); }));
}

async function main() {
  let [email, name, ringName] = process.argv.slice(2);

  if (!email) email = await ask('E-Mail-Adresse: ');
  if (!name) name = await ask('Name: ');

  if (!email || !name) {
    console.error('E-Mail und Name sind erforderlich.');
    process.exit(1);
  }

  const ringRes = ringName
    ? await pool.query('SELECT id, name FROM rings WHERE name = $1', [ringName])
    : await pool.query('SELECT id, name FROM rings ORDER BY id LIMIT 1');

  if (ringRes.rows.length === 0) {
    console.error(ringName ? `Ring "${ringName}" nicht gefunden.` : 'Es ist noch kein Ring angelegt.');
    process.exit(1);
  }
  const ring = ringRes.rows[0];

  const password = generatePassword();
  const hash = await bcrypt.hash(password, 10);

  const existing = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);

  let action: string;
  if (existing.rows.length > 0) {
    // Vorhandenes Konto hochstufen und Passwort neu setzen.
    await pool.query(
      `UPDATE users SET role = 'super_admin', name = $2, password_hash = $3,
                        active = TRUE, must_change_password = TRUE
       WHERE id = $1`,
      [existing.rows[0].id, name, hash]
    );
    action = 'aktualisiert (auf Super-Administration hochgestuft)';
  } else {
    await pool.query(
      `INSERT INTO users (email, password_hash, name, ring_id, role, must_change_password)
       VALUES ($1, $2, $3, $4, 'super_admin', TRUE)`,
      [email, hash, name, ring.id]
    );
    action = 'neu angelegt';
  }

  await audit(null, 'user.create_superadmin', `email:${email}`, { via: 'CLI' });

  console.log('\n' + '='.repeat(58));
  console.log('  SUPER-ADMINISTRATION – ZUGANGSDATEN');
  console.log('='.repeat(58));
  console.log(`  Konto     : ${action}`);
  console.log(`  Name      : ${name}`);
  console.log(`  E-Mail    : ${email}`);
  console.log(`  Passwort  : ${password}`);
  console.log(`  Ring      : ${ring.name}`);
  console.log('='.repeat(58));
  console.log('  Das Passwort wird NUR JETZT angezeigt.');
  console.log('  Bei der ersten Anmeldung muss es geändert werden.');
  console.log('='.repeat(58) + '\n');

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
