import fs from 'fs';
import path from 'path';
import pool from '../db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { MEMBER_RINGS } from '../config/rings';

const SCHEMA_PATH   = path.join(__dirname, '../../sql/schema.sql');
const POLYGONS_PATH = path.join(__dirname, '../../data/ring-boundaries.geojson');
const OFFICES_PATH  = path.join(__dirname, '../../data/offices.json');

async function applySchema() {
  await pool.query(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
  console.log('Schema applied (PostGIS + tables).');
}

async function seedRings() {
  // Every participating ring must exist even if its polygon could not be built.
  for (const ring of MEMBER_RINGS) {
    await pool.query(
      'INSERT INTO rings (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [ring.name]
    );
  }

  if (fs.existsSync(OFFICES_PATH)) {
    const offices = JSON.parse(fs.readFileSync(OFFICES_PATH, 'utf-8'));
    for (const o of offices) {
      await pool.query(
        `UPDATE rings SET office_town = $2, office_lat = $3, office_lng = $4 WHERE name = $1`,
        [o.name, o.town, o.lat ?? null, o.lng ?? null]
      );
    }
    console.log(`Geschäftsstellen updated for ${offices.length} rings.`);
  } else {
    console.warn('offices.json not found – run "npm run geocode" first.');
  }

  if (!fs.existsSync(POLYGONS_PATH)) {
    console.warn('ring-boundaries.geojson not found – run "npm run boundaries" (amtlich) or "npm run polygons" (Hülle).');
    return;
  }
  const geojson = JSON.parse(fs.readFileSync(POLYGONS_PATH, 'utf-8'));
  let written = 0, kept = 0;
  for (const feature of geojson.features) {
    const name = feature.properties.name;
    const geometry = JSON.stringify(feature.geometry);
    const source = feature.properties.source?.includes('VG250') ? 'official' : 'hull';

    // Eine bereits vorhandene amtliche Grenze darf nicht von einer gröberen
    // konvexen Hülle überschrieben werden.
    const result = await pool.query(
      `INSERT INTO rings (name, boundary, boundary_source)
       VALUES ($1, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)), $3)
       ON CONFLICT (name) DO UPDATE SET
         boundary = EXCLUDED.boundary,
         boundary_source = EXCLUDED.boundary_source
       WHERE rings.boundary_source IS DISTINCT FROM 'official'
          OR EXCLUDED.boundary_source = 'official'
       RETURNING id`,
      [name, geometry, source]
    );
    if (result.rowCount) written++; else kept++;
  }
  console.log(`Rings seeded (${written} Grenzen geschrieben, ${kept} amtliche Grenzen beibehalten).`);
}

async function ringIdByName(name: string): Promise<number | null> {
  const r = await pool.query('SELECT id FROM rings WHERE name = $1', [name]);
  return r.rows[0]?.id ?? null;
}

/**
 * Startpasswort für ein Seed-Konto.
 *
 * Bewusst zufällig und nicht fest im Code: ein in der Dokumentation
 * nachlesbares Passwort ist auf einem öffentlich erreichbaren Server das
 * gleiche wie kein Passwort. Es wird genau einmal ausgegeben und kann
 * danach nur noch von der Verwaltung zurückgesetzt werden.
 */
function startPassword(length = 14): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

async function seedUsers() {
  // Test accounts from the Anforderungen document (point 5).
  const sha = 'Maschinen- und Betriebshilfsring Schwäbisch Hall e. V.';
  const hok = 'Maschinen- und Betriebshilfsring Hohenlohekreis e. V.';

  // Bewusst KEIN Super-Admin-Demokonto: ein bekanntes Konto mit bekanntem
  // Passwort wäre der einfachste Weg, die höchste Berechtigung zu übernehmen.
  // Super-Administratoren werden ausschließlich über
  //   npm run create-superadmin -- <e-mail> "<Name>"
  // angelegt; das Passwort wird dabei zufällig erzeugt und einmalig angezeigt.
  // Je Ring ein Ring-Admin, der die Benutzer des eigenen Rings verwaltet.
  // Übrige Einsatzleitungen sind 'member': sie sehen alles und pflegen die
  // eigenen Mitarbeiter, dürfen aber keine Benutzerkonten anlegen.
  const accounts = [
    { email: 'fritz.hube@mbr-sha.de',    name: 'Fritz Hube',            ring: sha, role: 'ring_admin' },
    { email: 'stefanie.kamm@mbr-sha.de', name: 'Stefanie Kamm',         ring: sha, role: 'member' },
    { email: 'rschmitz@mr-hok.de',       name: 'Rosemarie Schmitz',     ring: hok, role: 'ring_admin' },
  ];

  const vergeben: string[] = [];
  for (const acc of accounts) {
    const ringId = await ringIdByName(acc.ring);
    if (!ringId) { console.warn(`  ! ring not found for ${acc.email}`); continue; }
    const klartext = startPassword();
    // Ein bestehendes Konto behält sein Passwort: ein erneuter Seed-Lauf darf
    // niemandem die Anmeldung unter den Füßen wegziehen.
    const r = await pool.query(
      `INSERT INTO users (email, password_hash, ring_id, role, name, must_change_password)
       VALUES ($1,$2,$3,$4,$5,TRUE)
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, name = EXCLUDED.name
       RETURNING (users.created_at > now() - interval '5 seconds') AS neu`,
      [acc.email, await bcrypt.hash(klartext, 10), ringId, acc.role, acc.name]
    );
    const neu = r.rows[0]?.neu === true;
    console.log(`  user ${acc.email} (${acc.role})${neu ? '' : ' – Passwort unverändert'}`);
    if (neu) vergeben.push(`  ${acc.email.padEnd(28)} ${klartext}`);
  }

  if (vergeben.length) {
    console.log('\nStartpasswörter (werden nur jetzt angezeigt, danach nie wieder):');
    console.log(vergeben.join('\n'));
    console.log('Bei der ersten Anmeldung muss jedes Konto ein eigenes Passwort setzen.');
  }
}

async function main() {
  await applySchema();
  await seedRings();
  await seedUsers();
  await pool.end();
  console.log('\nSeeding complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
