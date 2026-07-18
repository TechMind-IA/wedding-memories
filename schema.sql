-- =============================================
-- Schema: Wedding Memories (Multi-Tenant)
-- Banco: Neon PostgreSQL
-- =============================================

-- ─── Tabela principal de casamentos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weddings (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  access_code    TEXT        NOT NULL UNIQUE,           -- hex de 12 chars (ex: "a3f8b2c1d9e4")
  slug           TEXT        NOT NULL UNIQUE,           -- "brendaejonathas"
  couple_names   TEXT        NOT NULL,                  -- "Brenda & Jonathas"
  wedding_date   TEXT,                                 -- "10.10.26"
  theme_color    TEXT        DEFAULT '#C2754F',
  is_active      BOOLEAN     DEFAULT TRUE,
  created_at     TIMESTAMP   DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_weddings_access_code ON weddings (access_code);
CREATE INDEX IF NOT EXISTS idx_weddings_slug ON weddings (slug);

-- ─── Sessões de super admin ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS super_admin_sessions (
  token        TEXT        PRIMARY KEY,
  expires_at   TIMESTAMP   NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_expires ON super_admin_sessions (expires_at);

-- ─── Rate limiting (DB-backed) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  key          TEXT        NOT NULL,
  count        INTEGER     NOT NULL DEFAULT 1,
  window_start TIMESTAMP   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (key, window_start)
);

-- ─── Super admins ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS super_admins (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email          TEXT        NOT NULL UNIQUE,
  password_hash  TEXT        NOT NULL,
  created_at     TIMESTAMP   DEFAULT NOW() NOT NULL
);

-- ─── Fotos e vídeos (multi-tenant) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS photos (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id     UUID        NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  created_at     TIMESTAMP   DEFAULT NOW() NOT NULL,
  file_path      TEXT        NOT NULL,
  file_name      TEXT        NOT NULL,
  file_size      INTEGER     NOT NULL,
  mime_type      TEXT        NOT NULL,
  storage_url    TEXT        NOT NULL,
  s3_key         TEXT,
  uploader_name  TEXT,
  is_video       BOOLEAN     DEFAULT FALSE,
  date_taken     TIMESTAMP,
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_photos_wedding ON photos (wedding_id);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_is_video ON photos (is_video) WHERE is_video = TRUE;

-- ─── Reações (via photos FK cascade) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS photo_reactions (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id       UUID        NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  emoji          TEXT        NOT NULL,
  session_id     TEXT        NOT NULL,
  created_at     TIMESTAMP   DEFAULT NOW() NOT NULL,
  UNIQUE (photo_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_photo_id ON photo_reactions (photo_id);

-- ─── Configurações por casamento ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_config (
  wedding_id     UUID        REFERENCES weddings(id) ON DELETE CASCADE,
  key            TEXT        NOT NULL,
  value          TEXT        NOT NULL,
  PRIMARY KEY (wedding_id, key)
);

CREATE INDEX IF NOT EXISTS idx_admin_config_wedding ON admin_config (wedding_id);

-- ─── Eventos da timeline por casamento ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline_events (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id     UUID        NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  label          TEXT        NOT NULL,
  emoji          TEXT        NOT NULL,
  start_date     TIMESTAMP   NOT NULL,
  end_date       TIMESTAMP   NOT NULL,
  sort_order     INTEGER     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_timeline_wedding ON timeline_events (wedding_id);
