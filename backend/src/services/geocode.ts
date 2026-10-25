import fs from 'fs';
import path from 'path';
import axios from 'axios';

const CACHE_PATH = path.join(__dirname, '../../data/geocode-cache.json');

type Coords = { lat: number; lng: number };

function loadCache(): Record<string, Coords> {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    }
  } catch {
    /* corrupt cache – start fresh */
  }
  return {};
}

function saveCache(cache: Record<string, Coords>) {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error('Could not write geocode cache:', err);
  }
}

let cache = loadCache();
let lastRequest = 0;

/** Nominatim asks for at most 1 request per second. */
async function throttle() {
  const wait = 1000 - (Date.now() - lastRequest);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();
}

/**
 * Schreibweisen, unter denen ein Wohnort gesucht wird – in dieser Reihenfolge.
 *
 * Anlass: „Neudenau-Kressbach" – Hauptort und Teilort, wie es in einer Anschrift
 * üblich ist – blieb ohne Treffer, obwohl Nominatim den Ort kennt. Ursache war
 * der angehängte Zusatz „, Deutschland": die Suche nach
 * „Neudenau-Kressbach, Deutschland" liefert nichts, die nach
 * „Neudenau-Kressbach" dagegen den richtigen Punkt. Das Land wird deshalb über
 * den Parameter `countrycodes` eingegrenzt statt über den Suchtext.
 *
 * Bleibt die vollständige Schreibweise erfolglos, wird der Name an Bindestrich,
 * Schrägstrich oder Komma zerlegt. Zuerst wird „Teilort, Hauptort" versucht,
 * dann der Teilort allein – der ist der genauere Punkt –, zuletzt der Hauptort.
 * So landet die Person notfalls im richtigen Hauptort statt gar nicht auf der
 * Karte.
 */
export function ortSchreibweisen(town: string): string[] {
  const voll = town.trim().replace(/\s+/g, ' ');
  const kandidaten = [voll];

  const teile = voll.split(/\s*[-/,]\s*/).map(t => t.trim()).filter(Boolean);
  if (teile.length >= 2) {
    const haupt = teile[0];
    const teil = teile[teile.length - 1];
    kandidaten.push(`${teil}, ${haupt}`, teil, haupt);
  }
  return [...new Set(kandidaten)];
}

async function nominatim(q: string): Promise<Coords | null> {
  await throttle();
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q, countrycodes: 'de', format: 'json', limit: 1 },
    headers: { 'User-Agent': 'BHD-Regionalplan/1.0 (Maschinenringe, interne Nutzung)' },
    timeout: 15000,
  });
  if (!response.data || response.data.length === 0) return null;
  const { lat, lon } = response.data[0];
  return { lat: parseFloat(lat), lng: parseFloat(lon) };
}

export async function geocodeTown(town: string): Promise<Coords | null> {
  if (!town) return null;
  const key = town.trim().toLowerCase();
  if (cache[key]) return cache[key];

  for (const schreibweise of ortSchreibweisen(town)) {
    try {
      const coords = await nominatim(schreibweise);
      if (coords) {
        // Unter dem ursprünglich eingegebenen Namen ablegen: beim nächsten Mal
        // ist derselbe Ort ohne weitere Anfrage da.
        cache[key] = coords;
        saveCache(cache);
        return coords;
      }
    } catch (error: any) {
      console.error(`Geocoding fehlgeschlagen für "${schreibweise}":`, error.message);
    }
  }
  console.warn(`Kein Treffer für Wohnort "${town}" – auch nicht zerlegt.`);
  return null;
}

/** Pre-seed the in-process cache from an already generated locations.json. */
export function primeCache(entries: Array<{ city: string; lat?: number; lng?: number }>) {
  for (const e of entries) {
    if (e.lat !== undefined && e.lng !== undefined) {
      cache[e.city.trim().toLowerCase()] = { lat: e.lat, lng: e.lng };
    }
  }
  saveCache(cache);
}
