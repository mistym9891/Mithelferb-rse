-- Maschinenringe Staff Sharing App – database schema
-- PostGIS is required for ring boundary polygons (ST_GeomFromGeoJSON / ST_AsGeoJSON).
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS rings (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  office_town TEXT,
  office_lat  DOUBLE PRECISION,
  office_lng  DOUBLE PRECISION,
  boundary    GEOMETRY(Polygon, 4326),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT,
  ring_id       INTEGER NOT NULL REFERENCES rings(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'ring_admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff (
  id            SERIAL PRIMARY KEY,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  abbreviation  TEXT NOT NULL,
  town          TEXT NOT NULL,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  type          TEXT NOT NULL CHECK (type IN ('agricultural', 'urban')),
  gender        TEXT NOT NULL DEFAULT 'unknown' CHECK (gender IN ('male', 'female', 'unknown')),
  hours_per_day NUMERIC(4,1) NOT NULL DEFAULT 8,
  supervisor    TEXT,
  phone         TEXT,
  email         TEXT,
  ring_id       INTEGER NOT NULL REFERENCES rings(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT staff_ring_abbrev_unique UNIQUE (ring_id, abbreviation)
);

CREATE TABLE IF NOT EXISTS availabilities (
  id         SERIAL PRIMARY KEY,
  staff_id   INTEGER NOT NULL UNIQUE REFERENCES staff(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT availability_dates_valid CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_staff_ring       ON staff (ring_id);
CREATE INDEX IF NOT EXISTS idx_avail_staff      ON availabilities (staff_id);
CREATE INDEX IF NOT EXISTS idx_avail_dates      ON availabilities (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_rings_boundary   ON rings USING GIST (boundary);

-- ---------------------------------------------------------------------------
-- Amtliche Gemeindegrenzen (BKG VG250, ETRS89/UTM32 -> WGS84)
-- Quelle: Bundesamt für Kartographie und Geodäsie, Verwaltungsgebiete 1:250 000
-- Lizenz: Datenlizenz Deutschland – Namensnennung – Version 2.0 (dl-de/by-2-0)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gemeinden (
  ags        TEXT PRIMARY KEY,              -- Amtlicher Gemeindeschlüssel
  name       TEXT NOT NULL,                 -- GEN
  bez        TEXT,                          -- BEZ (Stadt, Gemeinde, ...)
  kreis_key  TEXT,                          -- SN_L || SN_R || SN_K
  geom       GEOMETRY(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gemeinden_geom ON gemeinden USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_gemeinden_name ON gemeinden (name);

-- Welche Gemeinde gehört zu welchem Ring (aus der Ortsliste abgeleitet).
CREATE TABLE IF NOT EXISTS ring_gemeinden (
  ring_id     INTEGER NOT NULL REFERENCES rings(id) ON DELETE CASCADE,
  ags         TEXT    NOT NULL REFERENCES gemeinden(ags) ON DELETE CASCADE,
  town_count  INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ring_id, ags)
);

-- Die Ringgrenze ist die Vereinigung mehrerer Gemeinden und damit in aller
-- Regel ein MultiPolygon – die Spalte wird bei Bedarf umgestellt.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM geometry_columns
    WHERE f_table_name = 'rings' AND f_geometry_column = 'boundary' AND type = 'POLYGON'
  ) THEN
    ALTER TABLE rings
      ALTER COLUMN boundary TYPE geometry(MultiPolygon, 4326) USING ST_Multi(boundary);
  END IF;
END $$;

-- Herkunft der aktuell gespeicherten Grenze: 'official' oder 'hull'.
ALTER TABLE rings ADD COLUMN IF NOT EXISTS boundary_source TEXT;

-- ---------------------------------------------------------------------------
-- Benutzerverwaltung: Rollen, Nutzungsbedingungen, Passwort-Zurücksetzung
-- ---------------------------------------------------------------------------

-- Rollen: 'super_admin' (ringübergreifend, IT/Administration),
--         'ring_admin'  (verwaltet den eigenen Ring und dessen Benutzer),
--         'member'      (Einsatzleitung: sieht alles, pflegt eigene Mitarbeiter)
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at   TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_version     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at       TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_valid') THEN
    ALTER TABLE users ADD CONSTRAINT users_role_valid
      CHECK (role IN ('super_admin', 'ring_admin', 'member'));
  END IF;
END $$;

-- Passwort-Zurücksetzung läuft bewusst NICHT per Selbstbedienung über E-Mail an
-- den Benutzer, sondern über die Administration: Der Benutzer stellt eine
-- Anfrage, die zuständigen Ring-Administratoren (und der Super-Admin) erhalten
-- einen Link, über den sie ein neues Passwort erzeugen und weitergeben.
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  handled_at    TIMESTAMPTZ,
  handled_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at  TIMESTAMPTZ,
  note          TEXT
);

CREATE INDEX IF NOT EXISTS idx_reset_open ON password_reset_requests (user_id)
  WHERE handled_at IS NULL AND cancelled_at IS NULL;

-- Protokoll administrativer Vorgänge (Nachvollziehbarkeit, DSGVO Art. 5 Abs. 2)
CREATE TABLE IF NOT EXISTS audit_log (
  id         SERIAL PRIMARY KEY,
  actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  target     TEXT,
  detail     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at DESC);

-- ---------------------------------------------------------------------------
-- Push-Benachrichtigungen (Web Push)
-- Damit erreichen Freimeldungen die Nutzer auch dann, wenn die App gerade
-- nicht geöffnet ist – auf dem Handy wie auf dem Rechner.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions (user_id);

-- Website des Rings (wird im Namen als Link hinterlegt)
ALTER TABLE rings ADD COLUMN IF NOT EXISTS website TEXT;
