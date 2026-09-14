import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/role';
import { geocodeTown } from '../services/geocode';
import { audit, broadcast } from '../services/notify';

/**
 * Verwaltung der Maschinenringe. Bewusst nur für die Super-Administration:
 * Ringe betreffen alle Beteiligten. Die Anwendung ist nicht auf eine feste
 * Zahl von Ringen festgelegt – es können jederzeit weitere hinzukommen.
 */
/**
 * Nur http(s) zulassen – so kann über das Eingabefeld kein "javascript:"-Link
 * in die Oberfläche gelangen.
 */
function normaliseWebsite(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

const router = Router();
router.use(authenticate, requireSuperAdmin);

// GET /api/admin/rings – mit Nutzungszahlen, damit klar ist, was am Ring hängt
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.name, r.office_town, r.office_lat, r.office_lng, r.website,
             r.boundary_source,
             (r.boundary IS NOT NULL) AS has_boundary,
             (SELECT COUNT(*) FROM users u WHERE u.ring_id = r.id)  AS user_count,
             (SELECT COUNT(*) FROM staff s WHERE s.ring_id = r.id)  AS staff_count,
             (SELECT COUNT(*) FROM ring_gemeinden g WHERE g.ring_id = r.id) AS gemeinde_count
      FROM rings r
      ORDER BY r.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ringe konnten nicht geladen werden' });
  }
});

// POST /api/admin/rings – neuen Ring anlegen
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, officeTown, website } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Name des Rings ist erforderlich' });
  }
  try {
    // Die Geschäftsstelle wird geokodiert, damit die Karte für Benutzer
    // dieses Rings sofort richtig zentriert.
    const coords = officeTown ? await geocodeTown(officeTown) : null;
    const result = await pool.query(
      `INSERT INTO rings (name, office_town, office_lat, office_lng, website)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name`,
      [String(name).trim(), officeTown || null, coords?.lat ?? null, coords?.lng ?? null,
       normaliseWebsite(website)]
    );
    await audit(req.user!.userId, 'ring.create', `ring:${result.rows[0].id}`, { name });
    broadcast('ringsChanged', { action: 'created' });
    res.status(201).json({
      ...result.rows[0],
      geocoded: coords != null,
      hint: coords ? undefined : 'Die Geschäftsstelle konnte nicht geokodiert werden – Adresse prüfen.',
    });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ein Ring mit diesem Namen existiert bereits' });
    }
    console.error(err);
    res.status(500).json({ error: 'Ring konnte nicht angelegt werden' });
  }
});

// PUT /api/admin/rings/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, officeTown, website } = req.body;
  try {
    const cur = await pool.query('SELECT office_town FROM rings WHERE id = $1', [id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Ring nicht gefunden' });

    // Nur neu geokodieren, wenn sich die Adresse tatsächlich geändert hat.
    let coords = null;
    const townChanged = officeTown !== undefined && officeTown !== cur.rows[0].office_town;
    if (townChanged && officeTown) coords = await geocodeTown(officeTown);

    const result = await pool.query(
      `UPDATE rings SET
         name = COALESCE($2, name),
         office_town = COALESCE($3, office_town),
         office_lat = COALESCE($4, office_lat),
         office_lng = COALESCE($5, office_lng),
         website = CASE WHEN $6::text IS NULL THEN website
                        WHEN $6 = '' THEN NULL ELSE $6 END
       WHERE id = $1 RETURNING id, name, office_town, website`,
      [id, name ?? null, officeTown ?? null, coords?.lat ?? null, coords?.lng ?? null,
       website === undefined ? null : normaliseWebsite(website) ?? '']
    );
    await audit(req.user!.userId, 'ring.update', `ring:${id}`, { name, officeTown });
    broadcast('ringsChanged', { action: 'updated' });
    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ein Ring mit diesem Namen existiert bereits' });
    }
    console.error(err);
    res.status(500).json({ error: 'Ring konnte nicht geändert werden' });
  }
});

// DELETE /api/admin/rings/:id – nur wenn nichts mehr daran hängt
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const counts = await pool.query(
      `SELECT (SELECT COUNT(*) FROM users u WHERE u.ring_id = $1) AS users,
              (SELECT COUNT(*) FROM staff s WHERE s.ring_id = $1) AS staff`,
      [id]
    );
    const { users, staff } = counts.rows[0];
    if (Number(users) > 0 || Number(staff) > 0) {
      return res.status(409).json({
        error: `Der Ring hat noch ${users} Benutzerkonto/-konten und ${staff} Mitarbeiter. ` +
               'Bitte diese zuerst verschieben oder löschen.',
      });
    }
    const del = await pool.query('DELETE FROM rings WHERE id = $1 RETURNING name', [id]);
    if (del.rows.length === 0) return res.status(404).json({ error: 'Ring nicht gefunden' });
    await audit(req.user!.userId, 'ring.delete', `ring:${id}`, { name: del.rows[0].name });
    broadcast('ringsChanged', { action: 'deleted' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ring konnte nicht gelöscht werden' });
  }
});

export default router;
