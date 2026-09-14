import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import axios from 'axios';

const EXCEL_PATH = path.join(__dirname, '../../data/Locations.xlsx');
const OUTPUT_PATH = path.join(__dirname, '../../data/locations.json');

interface Location {
  plz: string;
  city: string;
  district: string;
  ringName: string;
  lat?: number;
  lng?: number;
}

async function geocode(city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: city + ', Deutschland',
        format: 'json',
        limit: 1,
      },
      headers: { 'User-Agent': 'Maschinenringe-App/1.0' },
    });
    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      return { lat: parseFloat(lat), lng: parseFloat(lon) };
    }
    return null;
  } catch (error) {
    console.error(`Geocoding failed for ${city}:`, error);
    return null;
  }
}

async function main() {
  // Read Excel
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets['Tabelle1'];
  const data: any[] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // Columns: A=PLZ, B=Bestimmungsort, C=Kreis, D=Mitgliedseinrichtung (ring)
  const locations: Location[] = [];
  for (const row of data) {
    const plz = row[0]?.toString().trim();
    const city = row[1]?.toString().trim();
    const district = row[2]?.toString().trim();
    const ringName = row[3]?.toString().trim();
    if (!plz || !city || !ringName) continue; // skip empty rows
    locations.push({ plz, city, district, ringName });
  }

  // Geocode each city (avoid duplicates)
  const uniqueCities = [...new Set(locations.map(l => l.city))];
  const geocodeMap: Record<string, { lat: number; lng: number }> = {};
  for (const city of uniqueCities) {
    console.log(`Geocoding ${city}...`);
    const coords = await geocode(city);
    if (coords) {
      geocodeMap[city] = coords;
    }
    // Wait 1s to respect Nominatim usage policy
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Add coords to locations
  const enriched = locations.map(loc => ({
    ...loc,
    lat: geocodeMap[loc.city]?.lat,
    lng: geocodeMap[loc.city]?.lng,
  }));

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(enriched, null, 2));
  console.log(`Saved ${enriched.length} locations to ${OUTPUT_PATH}`);
}

main().catch(console.error);