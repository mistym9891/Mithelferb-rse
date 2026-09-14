import pool from '../db';
import { RING_WEBSITES } from '../config/ringWebsites';

/** Trägt die recherchierten Websites bei den Ringen ein. */
async function main() {
  let set = 0, missing: string[] = [];

  for (const [name, website] of Object.entries(RING_WEBSITES)) {
    const r = await pool.query(
      'UPDATE rings SET website = $2 WHERE name = $1 RETURNING id', [name, website]
    );
    if (r.rowCount) { set++; console.log(`  ${name}\n      -> ${website}`); }
  }

  const without = await pool.query('SELECT name FROM rings WHERE website IS NULL ORDER BY name');
  missing = without.rows.map(r => r.name);

  console.log(`\n${set} Ringe mit Website versehen.`);
  if (missing.length) {
    console.log(`${missing.length} ohne Website:`);
    missing.forEach(m => console.log(`  ! ${m}`));
  } else {
    console.log('Alle Ringe haben eine Website.');
  }
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
