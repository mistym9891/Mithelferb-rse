import fs from 'fs';
import path from 'path';
import pool from '../db';

/**
 * Baut die Ringgrenzen aus den amtlichen Gemeindegrenzen (BKG VG250).
 *
 * 1. Jeder Ort der Ortsliste wird über seine geprüften Koordinaten der Gemeinde
 *    zugeordnet, in der er liegt (Punkt-in-Polygon). Das ist bewusst nicht über
 *    den Namen gelöst: viele Bestimmungsorte sind Ortsteile ("Enslingen",
 *    "Gailenkirchen") und tauchen als Gemeindename gar nicht auf.
 * 2. Die Grenze eines Rings ist die Vereinigung aller so gefundenen Gemeinden.
 */

const LOCATIONS_PATH = path.join(__dirname, '../../data/locations.json');
const OUTPUT_PATH = path.join(__dirname, '../../data/ring-boundaries.geojson');

// Orte, deren Koordinate knapp neben der Gemeindefläche liegt (z. B. weil auf
// den PLZ-Mittelpunkt zurückgefallen wurde), werden der nächstgelegenen
// Gemeinde innerhalb dieser Entfernung zugeordnet.
const SNAP_METERS = 5000;

interface Location {
  plz: string;
  city: string;
  district: string;
  ringName: string;
  lat?: number;
  lng?: number;
}

async function main() {
  const locations: Location[] = JSON.parse(fs.readFileSync(LOCATIONS_PATH, 'utf-8'));

  const ringRes = await pool.query('SELECT id, name FROM rings');
  const ringIdByName = new Map<string, number>(ringRes.rows.map(r => [r.name, r.id]));

  await pool.query('DELETE FROM ring_gemeinden');

  let matched = 0, snapped = 0, unmatched = 0, noCoords = 0;
  const unmatchedList: string[] = [];

  for (const loc of locations) {
    if (loc.lat == null || loc.lng == null) { noCoords++; continue; }
    const ringId = ringIdByName.get(loc.ringName);
    if (!ringId) continue;

    // Punkt-in-Polygon
    let res = await pool.query(
      `SELECT ags, name FROM gemeinden
       WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
       LIMIT 1`,
      [loc.lng, loc.lat]
    );

    let viaSnap = false;
    if (res.rows.length === 0) {
      // Nächstgelegene Gemeinde innerhalb der Toleranz (geography = Meter)
      res = await pool.query(
        `SELECT ags, name,
                ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS dist
         FROM gemeinden
         WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)
         ORDER BY dist
         LIMIT 1`,
        [loc.lng, loc.lat, SNAP_METERS]
      );
      viaSnap = res.rows.length > 0;
    }

    if (res.rows.length === 0) {
      unmatched++;
      unmatchedList.push(`${loc.plz} ${loc.city} (${loc.ringName})`);
      continue;
    }

    if (viaSnap) snapped++; else matched++;

    await pool.query(
      `INSERT INTO ring_gemeinden (ring_id, ags, town_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (ring_id, ags) DO UPDATE SET town_count = ring_gemeinden.town_count + 1`,
      [ringId, res.rows[0].ags]
    );
  }

  console.log(`Ortszuordnung: ${matched} direkt, ${snapped} über Nachbarschaft, ${unmatched} ohne Gemeinde, ${noCoords} ohne Koordinaten.`);
  if (unmatchedList.length) unmatchedList.forEach(u => console.log(`  ! ${u}`));

  // Gemeinden, die zwei Ringen zugeordnet wurden (überlappende Einsatzgebiete)
  const overlaps = await pool.query(
    `SELECT g.name, COUNT(DISTINCT rg.ring_id) AS rings
     FROM ring_gemeinden rg JOIN gemeinden g ON g.ags = rg.ags
     GROUP BY g.name HAVING COUNT(DISTINCT rg.ring_id) > 1
     ORDER BY g.name`
  );
  if (overlaps.rows.length) {
    console.log(`\n${overlaps.rows.length} Gemeinde(n) sind mehreren Ringen zugeordnet:`);
    overlaps.rows.forEach(r => console.log(`  ~ ${r.name} (${r.rings} Ringe)`));
  }

  // Vereinigung der Gemeindeflächen je Ring
  console.log('\nBerechne Ringgrenzen ...');
  const updated = await pool.query(
    `UPDATE rings r
     SET boundary = sub.geom, boundary_source = 'official'
     FROM (
       SELECT rg.ring_id,
              ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Union(g.geom)), 3)) AS geom
       FROM ring_gemeinden rg
       JOIN gemeinden g ON g.ags = rg.ags
       GROUP BY rg.ring_id
     ) sub
     WHERE r.id = sub.ring_id
     RETURNING r.id, r.name`
  );
  console.log(`${updated.rowCount} Ringgrenzen aus amtlichen Gemeindegrenzen gesetzt.`);

  const summary = await pool.query(
    `SELECT r.name,
            COUNT(rg.ags) AS gemeinden,
            round((ST_Area(r.boundary::geography) / 1000000)::numeric, 0) AS km2,
            ST_NumGeometries(r.boundary) AS teilflaechen
     FROM rings r
     LEFT JOIN ring_gemeinden rg ON rg.ring_id = r.id
     GROUP BY r.id, r.name, r.boundary
     ORDER BY r.name`
  );
  console.log('\nRing                                                     Gem.    km²  Teilflächen');
  for (const row of summary.rows) {
    console.log(`  ${String(row.name).padEnd(54)} ${String(row.gemeinden).padStart(4)} ${String(row.km2 ?? '-').padStart(6)} ${String(row.teilflaechen ?? '-').padStart(6)}`);
  }

  // Ergebnis zusätzlich als GeoJSON ablegen (Nachvollziehbarkeit / Re-Seed)
  const geo = await pool.query(
    `SELECT name, ST_AsGeoJSON(boundary) AS geojson FROM rings WHERE boundary IS NOT NULL`
  );
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
    type: 'FeatureCollection',
    features: geo.rows.map(r => ({
      type: 'Feature',
      geometry: JSON.parse(r.geojson),
      properties: { name: r.name, source: 'BKG VG250 (dl-de/by-2-0)' },
    })),
  }));
  console.log(`\nGeschrieben: ${OUTPUT_PATH}`);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
