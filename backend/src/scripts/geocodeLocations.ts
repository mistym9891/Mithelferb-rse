import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import axios from 'axios';
import { MEMBER_RINGS, displayName, isMemberRing } from '../config/rings';

const EXCEL_PATH = path.join(__dirname, '../../data/Locations.xlsx');
const OUTPUT_PATH = path.join(__dirname, '../../data/locations.json');
const OFFICES_PATH = path.join(__dirname, '../../data/offices.json');
const CACHE_PATH = path.join(__dirname, '../../data/geocode-cache.json');

// Restrict geocoding to the seven participating rings unless ALL_RINGS=1.
// The Ortsliste covers all 25 Baden-Württemberg rings (1281 towns); at the
// 1 request/second Nominatim policy that would take ~21 minutes.
const ALL_RINGS = process.env.ALL_RINGS === '1';

interface Location {
  plz: string;
  city: string;
  district: string;
  ringName: string;   // display name
  excelName: string;
  isMember: boolean;
  lat?: number;
  lng?: number;
}

type Coords = { lat: number; lng: number };

function loadCache(): Record<string, Coords> {
  try {
    if (fs.existsSync(CACHE_PATH)) return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  } catch { /* start fresh */ }
  return {};
}
const cache = loadCache();
function saveCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

async function geocode(plz: string, city: string): Promise<Coords | null> {
  // Structured query with the postal code is far more reliable for German
  // towns than a free-text city name (many names occur more than once).
  const attempts: Record<string, string>[] = [
    { postalcode: plz, city, country: 'Germany' },
    { q: `${plz} ${city}, Deutschland` },
    { q: `${city}, Baden-Württemberg, Deutschland` },
  ];
  for (const params of attempts) {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { ...params, format: 'json', limit: 1 },
        headers: { 'User-Agent': 'Maschinenringe-App/1.0 (internal use)' },
        timeout: 20000,
      });
      await new Promise(r => setTimeout(r, 1100)); // Nominatim: max 1 req/s
      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        return { lat: parseFloat(lat), lng: parseFloat(lon) };
      }
    } catch (error: any) {
      console.error(`  ! request failed (${error.message})`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}

async function resolve(key: string, plz: string, city: string): Promise<Coords | null> {
  if (cache[key]) return cache[key];
  const coords = await geocode(plz, city);
  if (coords) {
    cache[key] = coords;
    saveCache();
  }
  return coords;
}

/** Centroid of a German postal code – used to sanity-check town matches. */
async function plzCentroid(plz: string): Promise<Coords | null> {
  const key = `plz|${plz}`;
  if (cache[key]) return cache[key];
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { postalcode: plz, country: 'Germany', format: 'json', limit: 1 },
      headers: { 'User-Agent': 'Maschinenringe-App/1.0 (internal use)' },
      timeout: 20000,
    });
    await new Promise(r => setTimeout(r, 1100));
    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      const coords = { lat: parseFloat(lat), lng: parseFloat(lon) };
      cache[key] = coords;
      saveCache();
      return coords;
    }
  } catch (error: any) {
    console.error(`  ! PLZ-Abfrage ${plz} fehlgeschlagen (${error.message})`);
  }
  return null;
}

function distanceKm(a: Coords, b: Coords): number {
  return Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 73);
}

/**
 * Many small German place names occur several times ("Horn", "Kirchberg",
 * "Mühlholz"). Nominatim then happily returns a town hundreds of kilometres
 * away. Verify every match against the centroid of its postal code and fall
 * back to that centroid when the match is implausible.
 */
const MAX_DISTANCE_KM = 25;

async function validateAgainstPlz(unique: Map<string, { plz: string; city: string }>) {
  console.log('\nPrüfe Treffer gegen die PLZ-Mittelpunkte ...');
  let corrected = 0;
  for (const [key, { plz, city }] of unique) {
    const coords = cache[key];
    if (!coords) continue;
    const centre = await plzCentroid(plz);
    if (!centre) continue;
    const d = distanceKm(coords, centre);
    if (d > MAX_DISTANCE_KM) {
      console.log(`  korrigiert: ${plz} ${city} – Treffer lag ${Math.round(d)} km von der PLZ entfernt`);
      cache[key] = centre;
      saveCache();
      corrected++;
    }
  }
  console.log(`${corrected} Orte korrigiert.`);
}

async function main() {
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets['Tabelle1'];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  // Columns: A=PLZ, B=Bestimmungsort, C=Kreis, D=Mitgliedseinrichtung. Row 0 is the header.
  const locations: Location[] = [];
  for (const row of rows.slice(1)) {
    const plz = row[0]?.toString().trim();
    const city = row[1]?.toString().trim();
    const district = row[2]?.toString().trim() || '';
    const excelName = row[3]?.toString().trim();
    if (!plz || !city || !excelName) continue;
    const member = isMemberRing(excelName);
    if (!ALL_RINGS && !member) continue;
    locations.push({
      plz, city, district,
      ringName: displayName(excelName),
      excelName,
      isMember: member,
    });
  }

  const unique = new Map<string, { plz: string; city: string }>();
  for (const l of locations) unique.set(`${l.plz}|${l.city}`, { plz: l.plz, city: l.city });

  console.log(`${locations.length} Ortszuordnungen, ${unique.size} eindeutige Orte zu geocodieren.`);
  let done = 0, failed = 0;
  for (const [key, { plz, city }] of unique) {
    done++;
    if (cache[key]) { console.log(`[${done}/${unique.size}] ${plz} ${city} (cache)`); continue; }
    process.stdout.write(`[${done}/${unique.size}] ${plz} ${city} ... `);
    const coords = await resolve(key, plz, city);
    console.log(coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'NICHT GEFUNDEN');
    if (!coords) failed++;
  }

  await validateAgainstPlz(unique);

  const enriched = locations.map(loc => {
    const c = cache[`${loc.plz}|${loc.city}`];
    return { ...loc, lat: c?.lat, lng: c?.lng };
  });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(enriched, null, 2));
  console.log(`\nSaved ${enriched.length} locations to ${OUTPUT_PATH} (${failed} ohne Koordinaten).`);

  // Geocode the seven Geschäftsstellen so the map can be centred on the
  // user's own office (requirement 1 of the Anforderungen).
  const offices: any[] = [];
  for (const ring of MEMBER_RINGS) {
    const key = `office|${ring.officeTown}`;
    const [plz, ...rest] = ring.officeTown.split(' ');
    const town = rest.join(' ');
    console.log(`Geschäftsstelle ${ring.name}: ${ring.officeTown} ...`);
    const coords = await resolve(key, plz, town);
    offices.push({
      name: ring.name,
      excelName: ring.excelName,
      street: ring.officeStreet,
      town: ring.officeTown,
      lat: coords?.lat,
      lng: coords?.lng,
    });
  }
  fs.writeFileSync(OFFICES_PATH, JSON.stringify(offices, null, 2));
  console.log(`Saved ${offices.length} offices to ${OFFICES_PATH}`);
}

main().catch(err => { console.error(err); process.exit(1); });
