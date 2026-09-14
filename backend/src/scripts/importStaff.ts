import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import pool from '../db';
import { matchStaffRing } from '../config/rings';

const EXCEL_PATH = path.join(__dirname, '../../data/Staff.xlsx');
const CACHE_PATH = path.join(__dirname, '../../data/geocode-cache.json');

type Coords = { lat: number; lng: number };

/** Look the town up in the cache produced by "npm run geocode". */
function townCoords(town: string): Coords | null {
  if (!fs.existsSync(CACHE_PATH)) return null;
  const cache: Record<string, Coords> = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  const needle = town.trim().toLowerCase();
  for (const [key, coords] of Object.entries(cache)) {
    // keys are "PLZ|Ort" from the Ortsliste, or "ort" from the live geocoder
    const city = key.includes('|') ? key.split('|')[1] : key;
    if (city.trim().toLowerCase() === needle) return coords;
  }
  return null;
}

/** "landw." / "städt." / "landw./städt." -> the app's two categories. */
function normaliseType(raw: string): 'agricultural' | 'urban' {
  const v = (raw || '').toLowerCase();
  // Mixed entries are treated as agricultural (the broader qualification).
  if (v.includes('landw')) return 'agricultural';
  return 'urban';
}

function normaliseGender(raw: string): 'male' | 'female' | 'unknown' {
  const v = (raw || '').trim().toLowerCase();
  if (v === 'w' || v.startsWith('weib')) return 'female';
  if (v === 'm' || v.startsWith('männ') || v.startsWith('maenn')) return 'male';
  return 'unknown';
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`${EXCEL_PATH} not found.`);
    process.exit(1);
  }
  const wb = xlsx.readFile(EXCEL_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  // Header: Name | Vorname | Kürzel | Geschlecht | Wohnort | landw./städtisch |
  //         Std./Tag | Maschinenring | Einsatzleitung | Telefon | Mail
  let imported = 0, skipped = 0;
  for (const row of rows.slice(1)) {
    const last_name  = row[0]?.toString().trim();
    const first_name = row[1]?.toString().trim();
    const abbrev     = row[2]?.toString().trim();
    const gender     = normaliseGender(row[3]?.toString());
    const town       = row[4]?.toString().trim();
    const type       = normaliseType(row[5]?.toString());
    const hours      = parseFloat(row[6]) || 8;
    const ringRaw    = row[7]?.toString().trim() || '';
    const supervisor = row[8]?.toString().trim() || null;
    const phone      = row[9]?.toString().trim() || null;
    const email      = row[10]?.toString().trim() || null;

    if (!last_name || !first_name || !abbrev || !town) { skipped++; continue; }

    const ringCfg = matchStaffRing(ringRaw);
    if (!ringCfg) { console.warn(`  ! kein Ring für "${ringRaw}" (${abbrev})`); skipped++; continue; }

    const ringRes = await pool.query('SELECT id FROM rings WHERE name = $1', [ringCfg.name]);
    if (ringRes.rows.length === 0) { console.warn(`  ! Ring "${ringCfg.name}" nicht in DB`); skipped++; continue; }
    const ringId = ringRes.rows[0].id;

    const coords = townCoords(town);
    if (!coords) console.warn(`  ~ keine Koordinaten für ${town} (${abbrev})`);

    await pool.query(
      `INSERT INTO staff
         (first_name, last_name, abbreviation, town, lat, lng, type, gender,
          hours_per_day, supervisor, phone, email, ring_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (ring_id, abbreviation) DO UPDATE SET
         first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
         town = EXCLUDED.town, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
         type = EXCLUDED.type, gender = EXCLUDED.gender,
         hours_per_day = EXCLUDED.hours_per_day, supervisor = EXCLUDED.supervisor,
         phone = EXCLUDED.phone, email = EXCLUDED.email`,
      [first_name, last_name, abbrev, town, coords?.lat ?? null, coords?.lng ?? null,
       type, gender, hours, supervisor, phone, email, ringId]
    );
    imported++;
    console.log(`  ${abbrev}  ${first_name} ${last_name.padEnd(14)} ${town.padEnd(16)} ${type === 'agricultural' ? 'L' : 'S'} ${hours}h ${gender}`);
  }

  console.log(`\n${imported} Mitarbeiter importiert, ${skipped} übersprungen.`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
