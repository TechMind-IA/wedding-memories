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
  const rows = await sql`SELECT * FROM photos ORDER BY created_at DESC`
  return rows as PhotoRecord[]
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