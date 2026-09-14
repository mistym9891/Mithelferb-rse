import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import pool from '../db';
import { MEMBER_RINGS, displayName, isMemberRing } from '../config/rings';

/**
 * Legt Maschinenringe aus der Ortsliste an.
 *
 * Die Anwendung ist nicht auf die sieben Gründungsringe festgelegt. Dieses
 * Skript liest alle in der Ortsliste vorkommenden Mitgliedseinrichtungen und
 * legt sie als Ringe an – aktuell 25 in Baden-Württemberg. Weitere Ringe
 * können jederzeit über die Verwaltung in der App ergänzt werden.
 *
 *   npm run import-rings              nur die sieben teilnehmenden Ringe
 *   ALL_RINGS=1 npm run import-rings  alle Ringe der Ortsliste
 */

const EXCEL_PATH = path.join(__dirname, '../../data/Locations.xlsx');
const ALL_RINGS = process.env.ALL_RINGS === '1';

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`${EXCEL_PATH} nicht gefunden.`);
    process.exit(1);
  }

  const wb = xlsx.readFile(EXCEL_PATH);
  const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets['Tabelle1'], { header: 1, blankrows: false });

  // Spalte D = Mitgliedseinrichtung; Zeile 0 ist die Kopfzeile.
  const excelNames = new Set<string>();
  for (const row of rows.slice(1)) {
    const name = row[3]?.toString().trim();
    if (name) excelNames.add(name);
  }

  const wanted = [...excelNames].filter(n => ALL_RINGS || isMemberRing(n));
  console.log(`${excelNames.size} Ringe in der Ortsliste, ${wanted.length} werden angelegt/aktualisiert.\n`);

  let created = 0, existing = 0;
  for (const excelName of wanted.sort()) {
    const name = displayName(excelName);
    const cfg = MEMBER_RINGS.find(r => r.excelName === excelName);

    const result = await pool.query(
      `INSERT INTO rings (name, office_town)
       VALUES ($1, $2)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      [name, cfg?.officeTown ?? null]
    );
    if (result.rowCount) { created++; console.log(`  + ${name}`); }
    else { existing++; }
  }

  const total = await pool.query('SELECT COUNT(*) FROM rings');
  console.log(`\n${created} neu angelegt, ${existing} bereits vorhanden.`);
  console.log(`Ringe in der Datenbank insgesamt: ${total.rows[0].count}`);
  console.log(
    '\nHinweis: Grenzen und Geschäftsstellen der neuen Ringe entstehen erst mit\n' +
    '  ALL_RINGS=1 npm run geocode   (dauert ca. 20 Minuten)\n' +
    '  npm run boundaries'
  );

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
