import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import pool from '../db';

const router = Router();
router.use(authenticate);

// GET /api/rings – alle Ringe mit Grenze als GeoJSON-FeatureCollection
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    // Die amtlichen VG250-Grenzen sind sehr detailliert: über alle 25 Ringe
    // Baden-Württembergs unvereinfacht rund 795 KB. Für die Karte wird
    // topologieerhaltend vereinfacht (0,0025° ≈ 200 m) – das ergibt ~123 KB
    // und ist bei den genutzten Zoomstufen nicht von der Vollversion zu
    // unterscheiden. Mit ?tolerance=0 kommt die exakte Geometrie.
    //
    // WICHTIG: Nach dem Vereinfachen wird am Umriss Baden-Württembergs
    // beschnitten. Das Vereinfachen verschiebt Stützpunkte um bis zu ~200 m;
    // an der Landesgrenze ragte die Ringfläche dadurch nach Bayern hinein
    // (gemeldet bei Dinkelsbühl, gemessen bis zu 1.190 ha). Der Schnitt
    // garantiert, dass keine Ringgrenze das Land verlässt.
    const tolerance = Math.min(
      Math.max(parseFloat(String(req.query.tolerance ?? '0.0025')) || 0, 0),
      0.05
    );

    const result = await pool.query(
      `WITH vereinfacht AS (
         SELECT r.id, r.name, r.short_code, r.office_street, r.office_town,
                r.office_lat, r.office_lng, r.website,
                CASE WHEN $1::float8 > 0
                     THEN ST_SimplifyPreserveTopology(r.boundary, $1::float8)
                     ELSE r.boundary END AS geom,
                l.geom AS maske
         FROM rings r
         LEFT JOIN landesgrenze l ON l.id = 1
       )
       SELECT id, name, short_code, office_street, office_town,
              office_lat, office_lng, website,
              ST_AsGeoJSON(
                CASE
                  WHEN geom IS NULL THEN NULL
                  WHEN maske IS NULL THEN geom
                  -- Nur beschneiden, wenn die Fläche die Landesgrenze wirklich
                  -- verlässt. Ringe im Landesinneren behalten so ihre schlanke
                  -- Geometrie; nur die Grenzringe übernehmen den genauen
                  -- Verlauf der Landesgrenze.
                  WHEN ST_CoveredBy(geom, maske) THEN geom
                  ELSE ST_Multi(ST_CollectionExtract(
                         ST_MakeValid(ST_Intersection(ST_MakeValid(geom), maske)), 3))
                END, 5
              ) AS geojson
       FROM vereinfacht
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
          short_code: row.short_code,
          office_street: row.office_street,
          office_town: row.office_town,
          office_lat: row.office_lat,
          office_lng: row.office_lng,
          website: row.website,
        },
      }));
    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ringe konnten nicht geladen werden' });
  }
});

// GET /api/rings/list – schlanke Liste für Auswahlfelder
router.get('/list', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, short_code, office_street, office_town,
              office_lat, office_lng, website
       FROM rings ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ringe konnten nicht geladen werden' });
  }
});

/**
 * GET /api/rings/towns – Orte und Teilorte der Ringe.
 *
 * Wird beim Hineinzoomen geladen, damit sichtbar wird, welcher Teilort zu
 * welchem Ring gehört. Optional auf einen Kartenausschnitt begrenzbar
 * (?bbox=west,süd,ost,nord), damit auf dem Handy nicht alle 1.300 Orte
 * übertragen werden.
 */
router.get('/towns', async (req: AuthRequest, res: Response) => {
  try {
    const bbox = String(req.query.bbox ?? '').split(',').map(Number);
    const hasBbox = bbox.length === 4 && bbox.every(n => Number.isFinite(n));

    const result = await pool.query(
      `SELECT t.id, t.ring_id, t.plz, t.name, t.district, t.lat, t.lng
       FROM ring_towns t
       ${hasBbox ? 'WHERE t.geom && ST_MakeEnvelope($1,$2,$3,$4, 4326)' : ''}
       ORDER BY t.name`,
      hasBbox ? bbox : []
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Orte konnten nicht geladen werden' });
  }
});

export default router;
