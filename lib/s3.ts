import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

if (!process.env.AWS_ACCESS_KEY_ID) throw new Error("AWS_ACCESS_KEY_ID não definido")
if (!process.env.AWS_SECRET_ACCESS_KEY) throw new Error("AWS_SECRET_ACCESS_KEY não definido")
if (!process.env.AWS_REGION) throw new Error("AWS_REGION não definido")
if (!process.env.AWS_S3_BUCKET_NAME) throw new Error("AWS_S3_BUCKET_NAME não definido")

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME
export const AWS_REGION = process.env.AWS_REGION

/**
 * Faz upload de um arquivo para o S3
 */
export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  })

  await s3Client.send(command)

  // Retorna a URL pública do arquivo
  return `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`
}

/**
 * Gera uma URL pré-assinada para acesso privado (expira em 1 hora)
 */
export async function getSignedFileUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  return getSignedUrl(s3Client, command, { expiresIn: 3600 })
}