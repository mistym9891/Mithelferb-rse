import fs from 'fs';
import path from 'path';
import pool from '../db';

const SCHEMA_PATH = path.join(__dirname, '../../sql/schema.sql');

async function main() {
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  console.log('Applying schema...');
  await pool.query(sql);
  console.log('Schema applied.');
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
