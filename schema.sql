-- =============================================
-- Schema: Wedding Memories
-- Banco: Neon PostgreSQL
-- =============================================

-- Tabela principal de fotos e vídeos
CREATE TABLE IF NOT EXISTS photos (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMP   DEFAULT NOW() NOT NULL,
  file_path     TEXT        NOT NULL,           -- Chave S3 (ex: "photos/uuid.jpg")
  file_name     TEXT        NOT NULL,           -- Nome original do arquivo
  file_size     INTEGER     NOT NULL,           -- Tamanho em bytes
  mime_type     TEXT        NOT NULL,           -- Tipo MIME (ex: "image/jpeg")
  storage_url   TEXT        NOT NULL,           -- URL pública no S3
  uploader_name TEXT,                           -- Nome do convidado
  is_video      BOOLEAN     DEFAULT FALSE       -- TRUE se for vídeo
);

-- Índice para ordenação por data (consulta principal)
CREATE INDEX IF NOT EXISTS photos_created_at_idx
  ON photos (created_at DESC);

-- Índice opcional para filtrar por uploader
CREATE INDEX IF NOT EXISTS photos_uploader_name_idx
  ON photos (uploader_name);
