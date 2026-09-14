import fs from 'fs';
import path from 'path';
import pool from '../db';
import bcrypt from 'bcryptjs';

const POLYGONS_PATH = path.join(__dirname, '../../data/ring-boundaries.geojson');

async function seedRings() {
  const raw = fs.readFileSync(POLYGONS_PATH, 'utf-8');
  const geojson = JSON.parse(raw);
  for (const feature of geojson.features) {
    const name = feature.properties.name;
    const geometry = JSON.stringify(feature.geometry);
    await pool.query(
      `INSERT INTO rings (name, boundary) VALUES ($1, ST_GeomFromGeoJSON($2)) ON CONFLICT (name) DO NOTHING`,
      [name, geometry]
    );
  }
  console.log('Rings seeded.');
}

async function seedAdminUser() {
  // Create a super admin (for demo)
  const hashed = await bcrypt.hash('admin123', 10);
  // We need a ring to associate – choose first ring
  const ringResult = await pool.query('SELECT id FROM rings LIMIT 1');
  if (ringResult.rows.length === 0) {
    console.warn('No rings found, skipping admin user');
    return;
  }
  const ringId = ringResult.rows[0].id;
  await pool.query(
    `INSERT INTO users (email, password_hash, ring_id, role) 
     VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
    ['admin@example.com', hashed, ringId, 'super_admin']
  );
  console.log('Admin user seeded (email: admin@example.com, password: admin123)');
}

async function seedDemoStaff() {
  // Optionally insert some dummy staff for the first ring
  const ringResult = await pool.query('SELECT id FROM rings LIMIT 1');
  if (ringResult.rows.length === 0) return;
  const ringId = ringResult.rows[0].id;
  await pool.query(
    `INSERT INTO staff (first_name, last_name, abbreviation, town, type, hours_per_day, phone, email, ring_id)
     VALUES 
     ('Max', 'Mustermann', 'MM', 'Musterstadt', 'agricultural', 8, '123456', 'max@example.com', $1),
     ('Erika', 'Musterfrau', 'EM', 'Musterdorf', 'urban', 6, '654321', 'erika@example.com', $1)
     ON CONFLICT (abbreviation) DO NOTHING`,
    [ringId]
  );
  console.log('Demo staff seeded.');
}

async function main() {
  await pool.connect();
  await seedRings();
  await seedAdminUser();
  await seedDemoStaff();
  await pool.end();
  console.log('Seeding complete.');
}

main().catch(console.error);