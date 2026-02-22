import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
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
 * Expira em 10 minutos. Retorna também a URL pública final do arquivo.
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
 * Gera uma URL pré-assinada para acesso privado (expira em 1 hora).
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