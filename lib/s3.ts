/**
 * Nome: lib/s3.ts
 * Função: Concentra utilitários de S3 usados pela aplicação.
 * Multi-tenant: arquivos organizados em pastas por access_code.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

function getS3Client() {
  if (!process.env.AWS_ACCESS_KEY_ID) throw new Error("AWS_ACCESS_KEY_ID não definido no .env.local")
  if (!process.env.AWS_SECRET_ACCESS_KEY) throw new Error("AWS_SECRET_ACCESS_KEY não definido no .env.local")
  if (!process.env.AWS_REGION) throw new Error("AWS_REGION não definido no .env.local")
  if (!process.env.AWS_S3_BUCKET_NAME) throw new Error("AWS_S3_BUCKET_NAME não definido no .env.local")

  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  })
}

function getBucketName() {
  if (!process.env.AWS_S3_BUCKET_NAME) throw new Error("AWS_S3_BUCKET_NAME não definido no .env.local")
  return process.env.AWS_S3_BUCKET_NAME
}

function getRegion() {
  if (!process.env.AWS_REGION) throw new Error("AWS_REGION não definido no .env.local")
  return process.env.AWS_REGION
}

/**
 * Faz upload de um arquivo para o S3 e retorna a URL pública.
 * Mantido para uso interno (ex: migrações futuras).
 */
export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const s3Client = getS3Client()
  const bucket = getBucketName()
  const region = getRegion()

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  })

  await s3Client.send(command)
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

/**
 * Gera uma presigned URL para o cliente fazer PUT direto no S3.
 * Retorna também a URL pública final do arquivo.
 */
export async function generatePresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn = 600
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const s3Client = getS3Client()
  const bucket = getBucketName()
  const region = getRegion()

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn })
  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`

  return { uploadUrl, publicUrl }
}

/**
 * Gera uma URL pré-assinada para acesso privado.
 */
export async function getSignedFileUrl(key: string): Promise<string> {
  const s3Client = getS3Client()
  const bucket = getBucketName()

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  return getSignedUrl(s3Client, command, { expiresIn: 3600 })
}

export async function deleteFromS3(key: string): Promise<void> {
  const s3Client = getS3Client()
  const bucket = getBucketName()

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  await s3Client.send(command)
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-tenant: geração de paths por casamento
// ─────────────────────────────────────────────────────────────────────────────

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
}

export function getExtension(mimeType: string): string {
  return MIME_TO_EXT[mimeType] ?? "bin"
}

/**
 * Gera nome e S3 key para um arquivo, organizado por casamento.
 * Formato: weddings/{accessCode}/photos/casamento_YYYYMMDD_[nome]_[uuid].[ext]
 */
export function generateS3Key(
  accessCode: string,
  uploaderName: string,
  mimeType: string,
  dateTaken?: string
): { fileName: string; s3Key: string } {
  const ext = getExtension(mimeType)
  const isVideo = mimeType.startsWith("video/")
  const folder = isVideo ? "videos" : "photos"

  const date = dateTaken ? new Date(dateTaken) : new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "")

  const nameSlug = uploaderName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 20)

  const shortId = crypto.randomUUID().replace(/-/g, "").slice(0, 8)
  const fileName = `casamento_${dateStr}_${nameSlug}_${shortId}.${ext}`
  const s3Key = `weddings/${accessCode}/${folder}/${fileName}`

  return { fileName, s3Key }
}
