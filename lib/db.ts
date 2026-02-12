import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definido")

export const sql = neon(process.env.DATABASE_URL)

/**
 * Inicializa o schema do banco de dados.
 * Execute isso uma vez ou use como migração.
 */
export async function initializeDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS photos (
      id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      created_at  TIMESTAMP   DEFAULT NOW() NOT NULL,
      file_path   TEXT        NOT NULL,
      file_name   TEXT        NOT NULL,
      file_size   INTEGER     NOT NULL,
      mime_type   TEXT        NOT NULL,
      storage_url TEXT        NOT NULL,
      uploader_name TEXT,
      is_video    BOOLEAN     DEFAULT FALSE
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS photos_created_at_idx
      ON photos (created_at DESC)
  `
}

export interface PhotoRecord {
  id: string
  created_at: string
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
  storage_url: string
  uploader_name?: string
  is_video?: boolean
}

/**
 * Insere um novo registro de foto no banco
 */
export async function insertPhoto(data: Omit<PhotoRecord, "id" | "created_at">): Promise<PhotoRecord> {
  const rows = await sql`
    INSERT INTO photos (file_path, file_name, file_size, mime_type, storage_url, uploader_name, is_video)
    VALUES (
      ${data.file_path},
      ${data.file_name},
      ${data.file_size},
      ${data.mime_type},
      ${data.storage_url},
      ${data.uploader_name ?? null},
      ${data.is_video ?? false}
    )
    RETURNING *
  `
  return rows[0] as PhotoRecord
}

/**
 * Busca todas as fotos ordenadas por data de criação (mais recente primeiro)
 */
export async function getAllPhotos(): Promise<PhotoRecord[]> {
  const rows = await sql`
    SELECT * FROM photos
    ORDER BY created_at DESC
  `
  return rows as PhotoRecord[]
}