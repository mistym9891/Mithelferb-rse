import fs from 'fs';
import path from 'path';
import pool from '../db';
const shapefile = require('shapefile');

/**
 * Importiert die amtlichen Gemeindegrenzen aus dem BKG-Datensatz VG250
 * (Verwaltungsgebiete 1:250 000) in die Tabelle `gemeinden`.
 *
 * Quelle : https://daten.gdz.bkg.bund.de/produkte/vg/vg250_ebenen_0101/aktuell/
 * Lizenz : Datenlizenz Deutschland – Namensnennung – Version 2.0 (dl-de/by-2-0)
 *          © GeoBasis-DE / BKG
 *
 * Die Shapefile-Koordinaten liegen in ETRS89 / UTM Zone 32N (EPSG:25832) vor.
 * Die Umrechnung nach WGS84 übernimmt PostGIS via ST_Transform – dadurch wird
 * keine zusätzliche Projektionsbibliothek benötigt.
 */

const BASE = path.join(__dirname, '../../data/vg250/vg250_ebenen_0101');
const SHP = path.join(BASE, 'VG250_GEM.shp');
const DBF = path.join(BASE, 'VG250_GEM.dbf');

// Nur Baden-Württemberg (Landesschlüssel 08). Mit ALL_STATES=1 wird ganz
// Deutschland importiert (11.094 Gemeinden, entsprechend langsamer).
const ONLY_BW = process.env.ALL_STATES !== '1';

async function main() {
  if (!fs.existsSync(SHP)) {
    console.error(`${SHP} nicht gefunden.`);
    console.error('Bitte zuerst den VG250-Datensatz nach backend/data/vg250/ entpacken.');
    process.exit(1);
  }

  const client = await pool.connect();
  let read = 0, imported = 0, skippedWater = 0, skippedState = 0;

  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE ring_gemeinden, gemeinden CASCADE');

    const source = await shapefile.open(SHP, DBF, { encoding: 'utf-8' });
    while (true) {
      const result = await source.read();
      if (result.done) break;
      read++;

      const f = result.value;
      const p = f.properties as any;

      // GF (Geofaktor) 4 = Land, 2 = Gewässer. Seeflächen gehören nicht zum
      // Einsatzgebiet und würden die Vereinigung verfälschen.
      if (p.GF !== 4) { skippedWater++; continue; }
      if (ONLY_BW && p.SN_L !== '08') { skippedState++; continue; }
      if (!f.geometry) continue;

      await client.query(
        `INSERT INTO gemeinden (ags, name, bez, kreis_key, geom)
         VALUES ($1, $2, $3, $4,
                 ST_Multi(ST_MakeValid(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($5), 25832), 4326))))
         ON CONFLICT (ags) DO UPDATE SET
           name = EXCLUDED.name, bez = EXCLUDED.bez,
           kreis_key = EXCLUDED.kreis_key, geom = EXCLUDED.geom`,
        [p.AGS, p.GEN, p.BEZ ?? null, `${p.SN_L}${p.SN_R}${p.SN_K}`, JSON.stringify(f.geometry)]
      );
      imported++;
      if (imported % 200 === 0) console.log(`  ${imported} Gemeinden importiert ...`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(`\n${read} Datensätze gelesen.`);
  console.log(`${imported} Gemeinden importiert (${skippedWater} Gewässerflächen, ${skippedState} andere Bundesländer übersprungen).`);

  const check = await pool.query(
    `SELECT COUNT(*) AS n,
            COUNT(*) FILTER (WHERE NOT ST_IsValid(geom)) AS invalid,
            round(ST_XMin(ST_Extent(geom))::numeric,2) AS min_lng,
            round(ST_XMax(ST_Extent(geom))::numeric,2) AS max_lng,
            round(ST_YMin(ST_Extent(geom))::numeric,2) AS min_lat,
            round(ST_YMax(ST_Extent(geom))::numeric,2) AS max_lat
     FROM gemeinden`
  );
  console.log('Prüfung:', check.rows[0]);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
