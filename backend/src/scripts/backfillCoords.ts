import pool from '../db';
import { geocodeTown } from '../services/geocode';

/** Fill in coordinates for staff whose Wohnort was not in the Ortsliste. */
async function main() {
  const res = await pool.query(
    'SELECT id, abbreviation, town FROM staff WHERE lat IS NULL OR lng IS NULL'
  );
  if (res.rows.length === 0) {
    console.log('Alle Mitarbeiter haben Koordinaten.');
    await pool.end();
    return;
  }
  for (const row of res.rows) {
    process.stdout.write(`${row.abbreviation} – ${row.town} ... `);
    const coords = await geocodeTown(row.town);
    if (coords) {
      await pool.query('UPDATE staff SET lat = $1, lng = $2 WHERE id = $3', [coords.lat, coords.lng, row.id]);
      console.log(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
    } else {
      console.log('NICHT GEFUNDEN');
    }
  }
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
