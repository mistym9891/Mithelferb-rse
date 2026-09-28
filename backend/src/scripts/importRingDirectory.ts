import fs from 'fs';
import path from 'path';
import pool from '../db';
import { RING_DIRECTORY } from '../config/ringDirectory';
import { geocodeTown } from '../services/geocode';

/**
 * Pflegt die Stammdaten aller Ringe ein und füllt die Nebentabellen:
 *
 *  1. Kurzzeichen, Anschrift und Website je Ring (alle 25, nicht nur die sieben)
 *  2. Geokodierung der Geschäftsstellen, damit die Karte richtig zentriert
 *  3. Orte und Teilorte je Ring aus locations.json (für die Anzeige beim Zoomen)
 *  4. Umriss Baden-Württembergs als Schnittmaske für die Ringgrenzen
 */

const LOCATIONS_PATH = path.join(__dirname, '../../data/locations.json');

interface Location {
  plz: string; city: string; district: string;
  ringName: string; lat?: number; lng?: number;
}

async function stammdaten() {
  console.log('1) Kurzzeichen, Anschriften und Websites');
  let updated = 0, missing: string[] = [];

  for (const r of RING_DIRECTORY) {
    const res = await pool.query(
      `UPDATE rings SET short_code = $2, office_street = $3, office_town = $4, website = $5
       WHERE name = $1 RETURNING id`,
      [r.name, r.shortCode, r.officeStreet, r.officeTown, r.website]
    );
    if (res.rowCount) updated++; else missing.push(r.name);
  }
  console.log(`   ${updated} Ringe aktualisiert.`);
  if (missing.length) missing.forEach(m => console.log(`   ! nicht in der Datenbank: ${m}`));

  const ohne = await pool.query('SELECT name FROM rings WHERE short_code IS NULL ORDER BY name');
  if (ohne.rowCount) {
    console.log(`   ${ohne.rowCount} Ring(e) ohne Kurzzeichen:`);
    ohne.rows.forEach(r => console.log(`   ! ${r.name}`));
  }
}

async function geschaeftsstellen() {
  console.log('\n2) Geschäftsstellen geokodieren');
  const rows = await pool.query(
    `SELECT id, name, office_street, office_town FROM rings
     WHERE office_town IS NOT NULL AND (office_lat IS NULL OR office_lng IS NULL)
     ORDER BY name`
  );
  if (rows.rowCount === 0) { console.log('   alle bereits verortet.'); return; }

  for (const r of rows.rows) {
    // Erst mit Straße versuchen (genauer), sonst nur Ort.
    const [plz, ...rest] = String(r.office_town).split(' ');
    const ort = rest.join(' ');
    let coords = await geocodeTown(`${r.office_street}, ${plz} ${ort}`);
    if (!coords) coords = await geocodeTown(`${plz} ${ort}`);

    if (coords) {
      await pool.query('UPDATE rings SET office_lat = $2, office_lng = $3 WHERE id = $1',
        [r.id, coords.lat, coords.lng]);
      console.log(`   ${r.name}: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
    } else {
      console.log(`   ! ${r.name}: nicht gefunden (${r.office_town})`);
    }
  }
}

async function orteUndTeilorte() {
  console.log('\n3) Orte und Teilorte je Ring');
  if (!fs.existsSync(LOCATIONS_PATH)) {
    console.log('   locations.json fehlt – bitte zuerst "npm run geocode" ausführen.');
    return;
  }
  const locations: Location[] = JSON.parse(fs.readFileSync(LOCATIONS_PATH, 'utf-8'));

  const ringRes = await pool.query('SELECT id, name FROM rings');
  const idByName = new Map<string, number>(ringRes.rows.map(r => [r.name, r.id]));

  await pool.query('TRUNCATE ring_towns');
  let inserted = 0, skipped = 0;

  for (const loc of locations) {
    const ringId = idByName.get(loc.ringName);
    if (!ringId || loc.lat == null || loc.lng == null) { skipped++; continue; }
    await pool.query(
      `INSERT INTO ring_towns (ring_id, plz, name, district, lat, lng, geom)
       VALUES ($1,$2,$3,$4,$5,$6, ST_SetSRID(ST_MakePoint($6,$5), 4326))
       ON CONFLICT (ring_id, plz, name) DO NOTHING`,
      [ringId, loc.plz, loc.city, loc.district || null, loc.lat, loc.lng]
    );
    inserted++;
  }
  const total = await pool.query('SELECT COUNT(*)::int AS n FROM ring_towns');
  console.log(`   ${inserted} Einträge verarbeitet, ${skipped} übersprungen – ${total.rows[0].n} Orte gespeichert.`);
}

async function landesgrenze() {
  console.log('\n4) Umriss Baden-Württembergs (Schnittmaske)');
  const n = await pool.query('SELECT COUNT(*)::int AS n FROM gemeinden');
  if (n.rows[0].n === 0) {
    console.log('   keine Gemeinden importiert – bitte zuerst "npm run gemeinden".');
    return;
  }
  await pool.query(
    `INSERT INTO landesgrenze (id, name, geom)
     SELECT 1, 'Baden-Württemberg',
            ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Union(geom)), 3))
     FROM gemeinden
     ON CONFLICT (id) DO UPDATE SET geom = EXCLUDED.geom, name = EXCLUDED.name`
  );
  const info = await pool.query(
    `SELECT round((ST_Area(geom::geography)/1000000)::numeric, 0) AS km2,
            ST_NumGeometries(geom) AS teile FROM landesgrenze WHERE id = 1`
  );
  console.log(`   Umriss gespeichert: ${info.rows[0].km2} km², ${info.rows[0].teile} Teilfläche(n).`);
  console.log('   (Baden-Württemberg misst rund 35.750 km² – Abweichungen durch Generalisierung.)');
}

async function main() {
  await stammdaten();
  await geschaeftsstellen();
  await orteUndTeilorte();
  await landesgrenze();

  const summary = await pool.query(
    `SELECT COUNT(*)::int AS ringe,
            COUNT(short_code)::int AS mit_kuerzel,
            COUNT(office_lat)::int AS verortet,
            COUNT(website)::int AS mit_website
     FROM rings`
  );
  console.log('\nErgebnis:', summary.rows[0]);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
