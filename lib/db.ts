import { neon } from "@neondatabase/serverless"

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definido no .env.local")
  return neon(process.env.DATABASE_URL)
}

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

export async function initializeDatabase() {
  const sql = getDb()

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
}

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