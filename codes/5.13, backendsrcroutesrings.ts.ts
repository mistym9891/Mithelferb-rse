import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import pool from '../db';

const router = Router();
router.use(authenticate);

// GET /api/rings – list all rings with boundaries (as GeoJSON)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, name, ST_AsGeoJSON(boundary) as geojson
      FROM rings
    `);
    const features = result.rows.map(row => ({
      type: 'Feature',
      geometry: JSON.parse(row.geojson),
      properties: { id: row.id, name: row.name }
    }));
    res.json({
      type: 'FeatureCollection',
      features
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rings' });
  }
});

export default router;