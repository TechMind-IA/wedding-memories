/**
 * Nome: lib/db.ts
 * Função: Concentra utilitários de DB usados pela aplicação.
 * Multi-tenant: todas as queries recebem weddingId.
 */

import { neon } from "@neondatabase/serverless"

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definido no .env.local")
  const url = process.env.DATABASE_URL.split("?")[0]
  return neon(url)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface PhotoRecord {
  id: string
  wedding_id: string
  created_at: string
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
  storage_url: string
  s3_key?: string
  uploader_name?: string
  is_video?: boolean
  date_taken?: string
  latitude?: number
  longitude?: number
}

export interface ReactionCount {
  emoji: string
  count: number
  reacted: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Migração
// ─────────────────────────────────────────────────────────────────────────────

export async function initializeDatabase() {
  const sql = getDb()

  // Tabela de casamentos
  await sql`
    CREATE TABLE IF NOT EXISTS weddings (
      id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      access_code    TEXT        NOT NULL UNIQUE,
      slug           TEXT        NOT NULL UNIQUE,
      couple_names   TEXT        NOT NULL,
      wedding_date   TEXT,
      theme_color    TEXT        DEFAULT '#C2754F',
      is_active      BOOLEAN     DEFAULT TRUE,
      created_at     TIMESTAMP   DEFAULT NOW() NOT NULL
    )
  `

  // Super admins
  await sql`
    CREATE TABLE IF NOT EXISTS super_admins (
      id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      email          TEXT        NOT NULL UNIQUE,
      password_hash  TEXT        NOT NULL,
      created_at     TIMESTAMP   DEFAULT NOW() NOT NULL
    )
  `

  // Sessões de super admin
  await sql`
    CREATE TABLE IF NOT EXISTS super_admin_sessions (
      token        TEXT        PRIMARY KEY,
      expires_at   TIMESTAMP   NOT NULL
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_expires ON super_admin_sessions (expires_at)`

  // Rate limiting (DB-backed)
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limit_attempts (
      key          TEXT        NOT NULL,
      count        INTEGER     NOT NULL DEFAULT 1,
      window_start TIMESTAMP   NOT NULL DEFAULT NOW(),
      PRIMARY KEY (key, window_start)
    )
  `

  // Fotos
  await sql`
    CREATE TABLE IF NOT EXISTS photos (
      id             UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
      wedding_id     UUID             NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
      created_at     TIMESTAMP        DEFAULT NOW() NOT NULL,
      file_path      TEXT             NOT NULL,
      file_name      TEXT             NOT NULL,
      file_size      INTEGER          NOT NULL,
      mime_type      TEXT             NOT NULL,
      storage_url    TEXT             NOT NULL,
      s3_key         TEXT,
      uploader_name  TEXT,
      is_video       BOOLEAN          DEFAULT FALSE,
      date_taken     TIMESTAMP,
      latitude       DOUBLE PRECISION,
      longitude      DOUBLE PRECISION
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_photos_wedding ON photos (wedding_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos (created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_photos_is_video ON photos (is_video) WHERE is_video = TRUE`

  // Reações
  await sql`
    CREATE TABLE IF NOT EXISTS photo_reactions (
      id          UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
      photo_id    UUID      NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      emoji       TEXT      NOT NULL,
      session_id  TEXT      NOT NULL,
      created_at  TIMESTAMP DEFAULT NOW() NOT NULL,
      UNIQUE (photo_id, session_id)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_reactions_photo_id ON photo_reactions (photo_id)`

  // Config admin (colunas fixas)
  await sql`
    CREATE TABLE IF NOT EXISTS admin_config (
      wedding_id              UUID PRIMARY KEY REFERENCES weddings(id) ON DELETE CASCADE,
      admin_password          TEXT        NOT NULL DEFAULT '',
      moderation_password     TEXT        NOT NULL DEFAULT '',
      couple_names            TEXT        NOT NULL DEFAULT '',
      wedding_date            TEXT,
      max_storage_gb          INTEGER     NOT NULL DEFAULT 50,
      gallery_created_at      TIMESTAMPTZ,
      font_family             TEXT        NOT NULL DEFAULT 'montserrat',
      background_type         TEXT        NOT NULL DEFAULT 'floral',
      custom_texts            JSONB       NOT NULL DEFAULT '{}',
      whatsapp_number         TEXT,
      gallery_expiration_date TEXT,
      session_token           TEXT        NOT NULL DEFAULT ''
    )
  `

  // Timeline
  await sql`
    CREATE TABLE IF NOT EXISTS timeline_events (
      id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      wedding_id     UUID        NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
      label          TEXT        NOT NULL,
      emoji          TEXT        NOT NULL,
      start_date     TIMESTAMP   NOT NULL,
      end_date       TIMESTAMP   NOT NULL,
      sort_order     INTEGER     NOT NULL DEFAULT 0
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_timeline_wedding ON timeline_events (wedding_id)`
}

// ─────────────────────────────────────────────────────────────────────────────
// Fotos (multi-tenant)
// ─────────────────────────────────────────────────────────────────────────────

export async function insertPhoto(
  weddingId: string,
  data: Omit<PhotoRecord, "id" | "created_at" | "wedding_id">
): Promise<PhotoRecord> {
  const sql = getDb()
  const rows = await sql`
    INSERT INTO photos (
      wedding_id, file_path, file_name, file_size, mime_type,
      storage_url, s3_key, uploader_name, is_video,
      date_taken, latitude, longitude
    )
    VALUES (
      ${weddingId},
      ${data.file_path},
      ${data.file_name},
      ${data.file_size},
      ${data.mime_type},
      ${data.storage_url},
      ${data.s3_key ?? null},
      ${data.uploader_name ?? null},
      ${data.is_video ?? false},
      ${data.date_taken ?? null},
      ${data.latitude ?? null},
      ${data.longitude ?? null}
    )
    RETURNING *
  `
  return rows[0] as PhotoRecord
}

export async function getAllPhotos(weddingId: string): Promise<PhotoRecord[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM photos
    WHERE wedding_id = ${weddingId}
    ORDER BY COALESCE(date_taken, created_at) DESC, created_at DESC
  `
  return rows as PhotoRecord[]
}

export async function getAllMediaCount(weddingId: string): Promise<number> {
  const sql = getDb()
  const rows = await sql`SELECT COUNT(*)::int AS count FROM photos WHERE wedding_id = ${weddingId}`
  return Number(rows[0]?.count ?? 0)
}

export async function getPhotosPage(
  weddingId: string,
  limit: number,
  cursor?: string | null
): Promise<{ photos: PhotoRecord[]; hasMore: boolean; nextCursor: string | null }> {
  const sql = getDb()
  const safeLimit = Math.min(Math.max(limit, 1), 80)
  const rows = cursor
    ? await sql`
        SELECT *, COALESCE(date_taken, created_at) AS sort_date FROM photos
        WHERE wedding_id = ${weddingId}
          AND COALESCE(date_taken, created_at) < ${cursor}
        ORDER BY COALESCE(date_taken, created_at) DESC, created_at DESC
        LIMIT ${safeLimit + 1}
      `
    : await sql`
        SELECT *, COALESCE(date_taken, created_at) AS sort_date FROM photos
        WHERE wedding_id = ${weddingId}
        ORDER BY COALESCE(date_taken, created_at) DESC, created_at DESC
        LIMIT ${safeLimit + 1}
      `

  const photos = rows.slice(0, safeLimit) as Array<PhotoRecord & { sort_date: string }>
  const hasMore = rows.length > safeLimit
  const nextCursor = photos.at(-1)?.sort_date ?? null

  return { photos, hasMore, nextCursor }
}

export async function deletePhoto(
  weddingId: string,
  id: string
): Promise<PhotoRecord | null> {
  const sql = getDb()
  const rows = await sql`
    DELETE FROM photos WHERE id = ${id} AND wedding_id = ${weddingId} RETURNING *
  `
  return (rows[0] as PhotoRecord) ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Reações (via photo FK, não precisa de weddingId direto)
// ─────────────────────────────────────────────────────────────────────────────

export async function photoBelongsToWedding(
  photoId: string,
  weddingId: string
): Promise<boolean> {
  const sql = getDb()
  const rows = await sql`SELECT 1 FROM photos WHERE id = ${photoId} AND wedding_id = ${weddingId} LIMIT 1`
  return rows.length > 0
}

export async function photosBelongToWedding(
  photoIds: string[],
  weddingId: string
): Promise<string[]> {
  if (photoIds.length === 0) return []
  const sql = getDb()
  const rows = await sql`SELECT id FROM photos WHERE id = ANY(${photoIds}) AND wedding_id = ${weddingId}`
  return rows.map((r) => r.id as string)
}

export async function getReactions(
  photoId: string,
  sessionId: string
): Promise<ReactionCount[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT
      emoji,
      COUNT(*)::int AS count,
      bool_or(session_id = ${sessionId}) AS reacted
    FROM photo_reactions
    WHERE photo_id = ${photoId}
    GROUP BY emoji
    ORDER BY count DESC
  `
  return rows as ReactionCount[]
}

export async function getReactionsBatch(
  photoIds: string[],
  sessionId: string
): Promise<Record<string, ReactionCount[]>> {
  if (photoIds.length === 0) return {}
  const sql = getDb()
  const rows = await sql`
    SELECT
      photo_id,
      emoji,
      COUNT(*)::int AS count,
      bool_or(session_id = ${sessionId}) AS reacted
    FROM photo_reactions
    WHERE photo_id = ANY(${photoIds})
    GROUP BY photo_id, emoji
    ORDER BY count DESC
  `

  const result: Record<string, ReactionCount[]> = {}
  for (const row of rows as Array<{
    photo_id: string
    emoji: string
    count: number
    reacted: boolean
  }>) {
    if (!result[row.photo_id]) result[row.photo_id] = []
    result[row.photo_id].push({ emoji: row.emoji, count: row.count, reacted: row.reacted })
  }
  return result
}

export async function toggleReaction(
  photoId: string,
  emoji: string,
  sessionId: string
): Promise<ReactionCount[]> {
  const sql = getDb()

  const existing = await sql`
    SELECT id, emoji FROM photo_reactions
    WHERE photo_id = ${photoId} AND session_id = ${sessionId}
  `

  if (existing.length > 0) {
    const current = existing[0] as { id: string; emoji: string }
    if (current.emoji === emoji) {
      await sql`DELETE FROM photo_reactions WHERE id = ${current.id}`
    } else {
      await sql`
        UPDATE photo_reactions SET emoji = ${emoji}, created_at = NOW() WHERE id = ${current.id}
      `
    }
  } else {
    await sql`
      INSERT INTO photo_reactions (photo_id, emoji, session_id)
      VALUES (${photoId}, ${emoji}, ${sessionId})
    `
  }

  return getReactions(photoId, sessionId)
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Config (multi-tenant — colunas fixas)
// ─────────────────────────────────────────────────────────────────────────────

/** Mapeamento de keys do sistema para colunas da tabela admin_config */
const KEY_TO_COLUMN: Record<string, string> = {
  admin_password: "admin_password",
  moderation_password: "moderation_password",
  couple_names: "couple_names",
  wedding_date: "wedding_date",
  max_storage_gb: "max_storage_gb",
  gallery_created_at: "gallery_created_at",
  font_family: "font_family",
  background_type: "background_type",
  custom_texts: "custom_texts",
  whatsapp_number: "whatsapp_number",
  gallery_expiration_date: "gallery_expiration_date",
  session_token: "session_token",
}

/** Converte uma linha da tabela admin_config para Record<string, string> */
function rowToConfigMap(row: Record<string, unknown>): Record<string, string> {
  const config: Record<string, string> = {}
  for (const [key, column] of Object.entries(KEY_TO_COLUMN)) {
    const val = row[column]
    if (val !== null && val !== undefined) {
      config[key] = typeof val === "object" ? JSON.stringify(val) : String(val)
    }
  }
  return config
}

export async function getConfig(
  weddingId: string,
  key: string
): Promise<string | null> {
  const column = KEY_TO_COLUMN[key]
  if (!column) return null

  const sql = getDb()
  const rows = await sql`SELECT ${sql.unsafe(column)} AS val FROM admin_config WHERE wedding_id = ${weddingId}`
  const val = rows[0]?.val
  if (val === null || val === undefined) return null
  if (typeof val === "object") return JSON.stringify(val)
  return String(val)
}

export async function setConfig(
  weddingId: string,
  key: string,
  value: string
): Promise<void> {
  const column = KEY_TO_COLUMN[key]
  if (!column) return

  const sql = getDb()

  // Garante que a linha existe
  await sql`
    INSERT INTO admin_config (wedding_id) VALUES (${weddingId})
    ON CONFLICT (wedding_id) DO NOTHING
  `

  // Atualiza a coluna específica
  if (column === "custom_texts") {
    await sql`UPDATE admin_config SET ${sql.unsafe(column)} = ${value}::jsonb WHERE wedding_id = ${weddingId}`
  } else if (column === "max_storage_gb") {
    const num = parseInt(value, 10) || 50
    await sql`UPDATE admin_config SET ${sql.unsafe(column)} = ${num} WHERE wedding_id = ${weddingId}`
  } else {
    await sql`UPDATE admin_config SET ${sql.unsafe(column)} = ${value} WHERE wedding_id = ${weddingId}`
  }
}

export async function getAllConfig(
  weddingId: string
): Promise<Record<string, string>> {
  const sql = getDb()
  const rows = await sql`SELECT * FROM admin_config WHERE wedding_id = ${weddingId} LIMIT 1`
  if (!rows[0]) return {}
  return rowToConfigMap(rows[0] as Record<string, unknown>)
}

// ─────────────────────────────────────────────────────────────────────────────
// Photos — contagem por tipo (multi-tenant)
// ─────────────────────────────────────────────────────────────────────────────

export async function getVideosCount(weddingId: string): Promise<number> {
  const sql = getDb()
  const rows = await sql`SELECT COUNT(*)::int AS count FROM photos WHERE wedding_id = ${weddingId} AND is_video = TRUE`
  return Number(rows[0]?.count ?? 0)
}

export async function getPhotosOnlyCount(weddingId: string): Promise<number> {
  const sql = getDb()
  const rows = await sql`SELECT COUNT(*)::int AS count FROM photos WHERE wedding_id = ${weddingId} AND is_video = FALSE`
  return Number(rows[0]?.count ?? 0)
}

export async function getTotalStorageUsed(weddingId: string): Promise<number> {
  const sql = getDb()
  const rows = await sql`SELECT COALESCE(SUM(file_size), 0)::bigint AS total FROM photos WHERE wedding_id = ${weddingId}`
  return Number(rows[0]?.total ?? 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline Events (multi-tenant)
// ─────────────────────────────────────────────────────────────────────────────

export interface TimelineEventDB {
  id: string
  wedding_id: string
  label: string
  emoji: string
  start_date: string
  end_date: string
  sort_order: number
}

export async function getTimelineEventsFromDB(
  weddingId: string
): Promise<TimelineEventDB[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT id, wedding_id, label, emoji,
           start_date::text AS start_date,
           end_date::text AS end_date,
           sort_order
    FROM timeline_events
    WHERE wedding_id = ${weddingId}
    ORDER BY sort_order ASC
  `
  return rows as TimelineEventDB[]
}

export async function createTimelineEvent(
  weddingId: string,
  event: {
    label: string
    emoji: string
    start_date: string
    end_date: string
    sort_order?: number
  }
): Promise<TimelineEventDB> {
  const sql = getDb()
  const maxOrder = await sql`SELECT COALESCE(MAX(sort_order), -1)::int AS max_order FROM timeline_events WHERE wedding_id = ${weddingId}`
  const order = event.sort_order ?? (Number(maxOrder[0]?.max_order ?? -1) + 1)

  const rows = await sql`
    INSERT INTO timeline_events (wedding_id, label, emoji, start_date, end_date, sort_order)
    VALUES (${weddingId}, ${event.label}, ${event.emoji}, ${event.start_date}, ${event.end_date}, ${order})
    RETURNING id, wedding_id, label, emoji,
              start_date::text AS start_date,
              end_date::text AS end_date,
              sort_order
  `
  return rows[0] as TimelineEventDB
}

export async function updateTimelineEvent(
  weddingId: string,
  id: string,
  event: {
    label?: string
    emoji?: string
    start_date?: string
    end_date?: string
    sort_order?: number
  }
): Promise<TimelineEventDB | null> {
  const sql = getDb()
  const existing = await sql`SELECT * FROM timeline_events WHERE id = ${id} AND wedding_id = ${weddingId}`
  if (existing.length === 0) return null

  const current = existing[0] as TimelineEventDB
  const rows = await sql`
    UPDATE timeline_events
    SET label      = ${event.label ?? current.label},
        emoji      = ${event.emoji ?? current.emoji},
        start_date = ${event.start_date ?? current.start_date},
        end_date   = ${event.end_date ?? current.end_date},
        sort_order = ${event.sort_order ?? current.sort_order}
    WHERE id = ${id} AND wedding_id = ${weddingId}
    RETURNING id, wedding_id, label, emoji,
              start_date::text AS start_date,
              end_date::text AS end_date,
              sort_order
  `
  return (rows[0] as TimelineEventDB) ?? null
}

export async function deleteTimelineEvent(
  weddingId: string,
  id: string
): Promise<boolean> {
  const sql = getDb()
  const rows = await sql`DELETE FROM timeline_events WHERE id = ${id} AND wedding_id = ${weddingId} RETURNING id`
  return rows.length > 0
}

export async function reorderTimelineEvents(
  weddingId: string,
  ids: string[]
): Promise<void> {
  const sql = getDb()
  if (ids.length === 0) return

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!ids.every((id) => uuidRegex.test(id))) {
    throw new Error("IDs inválidos")
  }

  const caseParts = ids.map((_, i) => `WHEN id = $${i + 1} THEN ${i}`).join(" ")
  const allParams = [...ids, ids]
  await sql.query(
    `UPDATE timeline_events SET sort_order = CASE ${caseParts} END WHERE id = ANY($${ids.length + 1}::uuid[]) AND wedding_id = $${ids.length + 2}`,
    [...allParams, weddingId]
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Super Admin queries
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllWeddings(): Promise<Array<{
  id: string
  accessCode: string
  slug: string
  coupleNames: string
  weddingDate: string | null
  themeColor: string
  isActive: boolean
  createdAt: string
}>> {
  const sql = getDb()
  const rows = await sql`
    SELECT id, access_code, slug, couple_names, wedding_date, theme_color, is_active, created_at::text AS created_at
    FROM weddings
    ORDER BY created_at DESC
  `
  return rows.map((r) => ({
    id: r.id as string,
    accessCode: r.access_code as string,
    slug: r.slug as string,
    coupleNames: r.couple_names as string,
    weddingDate: r.wedding_date as string | null,
    themeColor: (r.theme_color as string) || "#C2754F",
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
  }))
}

export async function createWedding(data: {
  accessCode: string
  slug: string
  coupleNames: string
  weddingDate?: string
  themeColor?: string
}): Promise<{ id: string }> {
  const sql = getDb()
  const rows = await sql`
    INSERT INTO weddings (access_code, slug, couple_names, wedding_date, theme_color)
    VALUES (${data.accessCode}, ${data.slug}, ${data.coupleNames}, ${data.weddingDate ?? null}, ${data.themeColor ?? "#C2754F"})
    RETURNING id
  `
  const weddingId = rows[0].id as string

  const { hash } = await import("bcryptjs")
  const hashedPassword = await hash("admin123", 10)
  const hashedModPassword = await hash(process.env.DELETE_PASSWORD || "jamelao", 10)

  await sql`
    INSERT INTO admin_config (
      wedding_id, admin_password, moderation_password, couple_names,
      wedding_date, max_storage_gb, gallery_created_at, font_family, background_type
    ) VALUES (
      ${weddingId},
      ${hashedPassword},
      ${hashedModPassword},
      ${data.coupleNames},
      ${data.weddingDate ?? null},
      50,
      ${new Date().toISOString()},
      'montserrat',
      'floral'
    )
  `

  return { id: weddingId }
}

export async function updateWedding(
  id: string,
  data: {
    slug?: string
    coupleNames?: string
    weddingDate?: string
    themeColor?: string
    isActive?: boolean
  }
): Promise<boolean> {
  const sql = getDb()
  const existing = await sql`SELECT * FROM weddings WHERE id = ${id}`
  if (existing.length === 0) return false

  const current = existing[0]
  const rows = await sql`
    UPDATE weddings
    SET slug          = ${data.slug ?? current.slug},
        couple_names  = ${data.coupleNames ?? current.couple_names},
        wedding_date  = ${data.weddingDate ?? current.wedding_date},
        theme_color   = ${data.themeColor ?? current.theme_color},
        is_active     = ${data.isActive ?? current.is_active}
    WHERE id = ${id}
    RETURNING id
  `
  return rows.length > 0
}

export async function deleteWedding(id: string): Promise<boolean> {
  const sql = getDb()
  const rows = await sql`DELETE FROM weddings WHERE id = ${id} RETURNING id`
  return rows.length > 0
}

export async function getWeddingStats(weddingId: string): Promise<{
  photosCount: number
  videosCount: number
  storageUsedGB: string
}> {
  const sql = getDb()
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE is_video = FALSE)::int AS photos_count,
      COUNT(*) FILTER (WHERE is_video = TRUE)::int AS videos_count,
      COALESCE(SUM(file_size), 0)::bigint AS total_bytes
    FROM photos WHERE wedding_id = ${weddingId}
  `
  const r = rows[0]
  return {
    photosCount: r?.photos_count ?? 0,
    videosCount: r?.videos_count ?? 0,
    storageUsedGB: ((Number(r?.total_bytes ?? 0)) / (1024 * 1024 * 1024)).toFixed(2),
  }
}
