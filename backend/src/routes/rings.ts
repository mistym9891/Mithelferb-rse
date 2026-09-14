import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import pool from '../db';

const router = Router();
router.use(authenticate);

// GET /api/rings – list all rings with boundaries (as GeoJSON FeatureCollection)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    // Die amtlichen VG250-Grenzen sind sehr detailliert: über alle 25 Ringe
    // Baden-Württembergs unvereinfacht rund 795 KB. Für die Karte wird
    // topologieerhaltend vereinfacht (0,0025° ≈ 200 m) – das ergibt ~123 KB
    // und ist bei den genutzten Zoomstufen nicht von der Vollversion zu
    // unterscheiden. Mit ?tolerance=0 liefert die Schnittstelle die exakte
    // Geometrie; in der Datenbank bleibt sie ohnehin unverändert erhalten.
    const tolerance = Math.min(Math.max(parseFloat(String(req.query.tolerance ?? '0.0025')) || 0, 0), 0.05);
    const result = await pool.query(
      `SELECT id, name, office_town, office_lat, office_lng, website,
              ST_AsGeoJSON(
                CASE WHEN $1::float8 > 0
                     THEN ST_SimplifyPreserveTopology(boundary, $1::float8)
                     ELSE boundary END,
                5
              ) AS geojson
       FROM rings
       ORDER BY name`,
      [tolerance]
    );
    const features = result.rows
      .filter(row => row.geojson)
      .map(row => ({
        type: 'Feature',
        geometry: JSON.parse(row.geojson),
        properties: {
          id: row.id,
          name: row.name,
          office_town: row.office_town,
          office_lat: row.office_lat,
          office_lng: row.office_lng,
          website: row.website,
        },
      }));
    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rings' });
  }
});

// GET /api/rings/list – plain list (id + name + office) for filter dropdowns
router.get('/list', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, office_town, office_lat, office_lng, website FROM rings ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rings' });
  }
});

export default router;
