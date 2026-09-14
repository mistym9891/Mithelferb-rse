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

export async function geocodeTown(town: string): Promise<Coords | null> {
  if (!town) return null;
  const key = town.trim().toLowerCase();
  if (cache[key]) return cache[key];

  await throttle();
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: `${town}, Deutschland`, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'Maschinenringe-App/1.0 (internal use)' },
      timeout: 15000,
    });
    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      const coords = { lat: parseFloat(lat), lng: parseFloat(lon) };
      cache[key] = coords;
      saveCache(cache);
      return coords;
    }
    return null;
  } catch (error: any) {
    console.error(`Geocoding failed for ${town}:`, error.message);
    return null;
  }
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
