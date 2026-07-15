/**
 * Nome: lib/db.ts
 * Função: Concentra utilitários de Db usados pela aplicação.
 */

import { neon } from "@neondatabase/serverless"

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definido no .env.local")
  return neon(process.env.DATABASE_URL)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface PhotoRecord {
  id: string
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
  reacted: boolean // true se o session_id atual reagiu com este emoji
}

// ─────────────────────────────────────────────────────────────────────────────
// Migração
// ─────────────────────────────────────────────────────────────────────────────

export async function initializeDatabase() {
  const sql = getDb()

  // Tabela principal de fotos e vídeos
  await sql`
    CREATE TABLE IF NOT EXISTS photos (
      id            UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
      created_at    TIMESTAMP        DEFAULT NOW() NOT NULL,
      file_path     TEXT             NOT NULL,
      file_name     TEXT             NOT NULL,
      file_size     INTEGER          NOT NULL,
      mime_type     TEXT             NOT NULL,
      storage_url   TEXT             NOT NULL,
      s3_key        TEXT,
      uploader_name TEXT,
      is_video      BOOLEAN          DEFAULT FALSE,
      date_taken    TIMESTAMP,
      latitude      DOUBLE PRECISION,
      longitude     DOUBLE PRECISION
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS photos_created_at_idx ON photos (created_at DESC)
  `

  await sql`
    CREATE INDEX IF NOT EXISTS photos_is_video_idx ON photos (is_video) WHERE is_video = TRUE
  `

  // Tabela de reações — 1 reação por sessão por foto
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

  await sql`
    CREATE INDEX IF NOT EXISTS reactions_photo_id_idx ON photo_reactions (photo_id)
  `

  // ─── Tabela de configurações do admin ──────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS admin_config (
      key    TEXT PRIMARY KEY,
      value  TEXT NOT NULL
    )
  `

  // Configurações iniciais (não sobrescreve se já existir)
  const defaultConfigs: Array<{ key: string; value: string }> = [
    { key: "admin_password", value: "admin123" },
    { key: "moderation_password", value: process.env.DELETE_PASSWORD || "jamelao" },
    { key: "max_storage_gb", value: "50" },
    { key: "couple_names", value: process.env.COUPLE_NAMES || "Brenda & Jonathas" },
    { key: "wedding_date", value: process.env.WEDDING_DATE || "10.10.26" },
    { key: "whatsapp_number", value: process.env.WHATSAPP_NUMBER || "5531988280047" },
  ]

  for (const cfg of defaultConfigs) {
    await sql`
      INSERT INTO admin_config (key, value)
      VALUES (${cfg.key}, ${cfg.value})
      ON CONFLICT (key) DO NOTHING
    `
  }

  // Data de criação da galeria (registrada uma única vez)
  await sql`
    INSERT INTO admin_config (key, value)
    VALUES ('gallery_created_at', NOW()::text)
    ON CONFLICT (key) DO NOTHING
  `

  // ─── Tabela de eventos da timeline ─────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS timeline_events (
      id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      label       TEXT        NOT NULL,
      emoji       TEXT        NOT NULL,
      start_date  TIMESTAMP   NOT NULL,
      end_date    TIMESTAMP   NOT NULL,
      sort_order  INTEGER     NOT NULL DEFAULT 0
    )
  `

  // Eventos iniciais (só insere se a tabela estiver vazia)
  const existingEvents = await sql`SELECT COUNT(*)::int AS count FROM timeline_events`
  if (Number(existingEvents[0]?.count ?? 0) === 0) {
    const initialEvents = [
      { label: "Pré-Wedding", emoji: "💍", start_date: "2026-03-05T00:00", end_date: "2026-03-05T23:59", sort_order: 0 },
      { label: "Chá de Panela", emoji: "🏠", start_date: "2026-06-13T10:00", end_date: "2026-06-14T18:00", sort_order: 1 },
      { label: "Cerimônia", emoji: "💍", start_date: "2026-10-10T14:00", end_date: "2026-10-10T17:29", sort_order: 2 },
      { label: "Festa", emoji: "🎉", start_date: "2026-10-10T17:30", end_date: "2026-10-11T01:00", sort_order: 3 },
      { label: "After", emoji: "🎉", start_date: "2026-10-11T01:01", end_date: "2026-10-12T23:59", sort_order: 4 },
      { label: "Despedida de Solteira", emoji: "👰", start_date: "2026-11-01T10:00", end_date: "2026-11-01T22:00", sort_order: 5 },
      { label: "Despedida de Solteiro", emoji: "🤵", start_date: "2026-11-02T10:00", end_date: "2026-11-02T22:00", sort_order: 6 },
    ]

    for (const evt of initialEvents) {
      await sql`
        INSERT INTO timeline_events (label, emoji, start_date, end_date, sort_order)
        VALUES (${evt.label}, ${evt.emoji}, ${evt.start_date}, ${evt.end_date}, ${evt.sort_order})
      `
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fotos
// ─────────────────────────────────────────────────────────────────────────────

export async function insertPhoto(
  data: Omit<PhotoRecord, "id" | "created_at">
): Promise<PhotoRecord> {
  const sql = getDb()

  const rows = await sql`
    INSERT INTO photos (
      file_path, file_name, file_size, mime_type,
      storage_url, s3_key, uploader_name, is_video,
      date_taken, latitude, longitude
    )
    VALUES (
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

export async function getAllPhotos(): Promise<PhotoRecord[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM photos
    ORDER BY COALESCE(date_taken, created_at) DESC, created_at DESC
  `
  return rows as PhotoRecord[]
}

export async function getAllMediaCount(): Promise<number> {
  const sql = getDb()
  const rows = await sql`SELECT COUNT(*)::int AS count FROM photos`
  return Number(rows[0]?.count ?? 0)
}

export async function getPhotosPage(
  limit: number,
  cursor?: string | null
): Promise<{ photos: PhotoRecord[]; hasMore: boolean; nextCursor: string | null }> {
  const sql = getDb()
  const safeLimit = Math.min(Math.max(limit, 1), 80)
  const rows = cursor
    ? await sql`
        SELECT *, COALESCE(date_taken, created_at) AS sort_date FROM photos
        WHERE COALESCE(date_taken, created_at) < ${cursor}
        ORDER BY COALESCE(date_taken, created_at) DESC, created_at DESC
        LIMIT ${safeLimit + 1}
      `
    : await sql`
        SELECT *, COALESCE(date_taken, created_at) AS sort_date FROM photos
        ORDER BY COALESCE(date_taken, created_at) DESC, created_at DESC
        LIMIT ${safeLimit + 1}
      `

  const photos = rows.slice(0, safeLimit) as Array<PhotoRecord & { sort_date: string }>
  const hasMore = rows.length > safeLimit
  const nextCursor = photos.at(-1)?.sort_date ?? null

  return { photos, hasMore, nextCursor }
}

export async function deletePhoto(id: string): Promise<PhotoRecord | null> {
  const sql = getDb()
  const rows = await sql`
    DELETE FROM photos WHERE id = ${id} RETURNING *
  `
  return (rows[0] as PhotoRecord) ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Reações
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna a contagem de reações de uma foto, indicando qual o sessionId já fez.
 */
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

/**
 * Retorna as contagens de reações para múltiplas fotos de uma vez.
 * Útil para pré-carregar a galeria inteira sem N+1 queries.
 */
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

/**
 * Toggle de reação com lógica de 1 reação por sessão por foto:
 * - Mesmo emoji → remove (toggle off)
 * - Emoji diferente → troca pelo novo
 * - Sem reação prévia → insere
 *
 * Retorna as contagens atualizadas após a operação.
 */
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
      // Mesmo emoji → remove
      await sql`DELETE FROM photo_reactions WHERE id = ${current.id}`
    } else {
      // Emoji diferente → troca
      await sql`
        UPDATE photo_reactions
        SET emoji = ${emoji}, created_at = NOW()
        WHERE id = ${current.id}
      `
    }
  } else {
    // Sem reação → insere
    await sql`
      INSERT INTO photo_reactions (photo_id, emoji, session_id)
      VALUES (${photoId}, ${emoji}, ${sessionId})
    `
  }

  return getReactions(photoId, sessionId)
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Config
// ─────────────────────────────────────────────────────────────────────────────

export async function getConfig(key: string): Promise<string | null> {
  const sql = getDb()
  const rows = await sql`SELECT value FROM admin_config WHERE key = ${key}`
  return (rows[0]?.value as string) ?? null
}

export async function setConfig(key: string, value: string): Promise<void> {
  const sql = getDb()
  await sql`
    INSERT INTO admin_config (key, value)
    VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}
  `
}

export async function getAllConfig(): Promise<Record<string, string>> {
  const sql = getDb()
  const rows = await sql`SELECT key, value FROM admin_config`
  const config: Record<string, string> = {}
  for (const row of rows as Array<{ key: string; value: string }>) {
    config[row.key] = row.value
  }
  return config
}

// ─────────────────────────────────────────────────────────────────────────────
// Photos — contagem por tipo
// ─────────────────────────────────────────────────────────────────────────────

export async function getVideosCount(): Promise<number> {
  const sql = getDb()
  const rows = await sql`SELECT COUNT(*)::int AS count FROM photos WHERE is_video = TRUE`
  return Number(rows[0]?.count ?? 0)
}

export async function getPhotosOnlyCount(): Promise<number> {
  const sql = getDb()
  const rows = await sql`SELECT COUNT(*)::int AS count FROM photos WHERE is_video = FALSE`
  return Number(rows[0]?.count ?? 0)
}

export async function getTotalStorageUsed(): Promise<number> {
  const sql = getDb()
  const rows = await sql`SELECT COALESCE(SUM(file_size), 0)::bigint AS total FROM photos`
  return Number(rows[0]?.total ?? 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline Events (DB)
// ─────────────────────────────────────────────────────────────────────────────

export interface TimelineEventDB {
  id: string
  label: string
  emoji: string
  start_date: string
  end_date: string
  sort_order: number
}

export async function getTimelineEventsFromDB(): Promise<TimelineEventDB[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT id, label, emoji,
           start_date::text AS start_date,
           end_date::text AS end_date,
           sort_order
    FROM timeline_events
    ORDER BY sort_order ASC
  `
  return rows as TimelineEventDB[]
}

export async function createTimelineEvent(event: {
  label: string
  emoji: string
  start_date: string
  end_date: string
  sort_order?: number
}): Promise<TimelineEventDB> {
  const sql = getDb()

  const maxOrder = await sql`SELECT COALESCE(MAX(sort_order), -1)::int AS max_order FROM timeline_events`
  const order = event.sort_order ?? (Number(maxOrder[0]?.max_order ?? -1) + 1)

  const rows = await sql`
    INSERT INTO timeline_events (label, emoji, start_date, end_date, sort_order)
    VALUES (${event.label}, ${event.emoji}, ${event.start_date}, ${event.end_date}, ${order})
    RETURNING id, label, emoji,
              start_date::text AS start_date,
              end_date::text AS end_date,
              sort_order
  `
  return rows[0] as TimelineEventDB
}

export async function updateTimelineEvent(
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

  // Busca o evento atual
  const existing = await sql`SELECT * FROM timeline_events WHERE id = ${id}`
  if (existing.length === 0) return null

  const current = existing[0] as TimelineEventDB

  const rows = await sql`
    UPDATE timeline_events
    SET label      = ${event.label ?? current.label},
        emoji      = ${event.emoji ?? current.emoji},
        start_date = ${event.start_date ?? current.start_date},
        end_date   = ${event.end_date ?? current.end_date},
        sort_order = ${event.sort_order ?? current.sort_order}
    WHERE id = ${id}
    RETURNING id, label, emoji,
              start_date::text AS start_date,
              end_date::text AS end_date,
              sort_order
  `
  return (rows[0] as TimelineEventDB) ?? null
}

export async function deleteTimelineEvent(id: string): Promise<boolean> {
  const sql = getDb()
  const rows = await sql`DELETE FROM timeline_events WHERE id = ${id} RETURNING id`
  return rows.length > 0
}

export async function reorderTimelineEvents(ids: string[]): Promise<void> {
  const sql = getDb()
  if (ids.length === 0) return

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!ids.every((id) => uuidRegex.test(id))) {
    throw new Error("IDs inválidos")
  }

  const caseParts = ids.map((_, i) => `WHEN id = $${i + 1} THEN ${i}`).join(" ")
  const allParams = [...ids, ids]
  await sql.query(
    `UPDATE timeline_events SET sort_order = CASE ${caseParts} END WHERE id = ANY($${ids.length + 1}::uuid[])`,
    allParams
  )
}
