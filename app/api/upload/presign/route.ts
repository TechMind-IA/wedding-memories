import { NextRequest, NextResponse } from "next/server"
import { generatePresignedPutUrl } from "@/lib/s3"
import { randomUUID } from "crypto"

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"]
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  }
  return map[mimeType] ?? "bin"
}

function generateS3Key(uploaderName: string, mimeType: string): { fileName: string; s3Key: string } {
  const ext = getExtension(mimeType)
  const folder = mimeType.startsWith("video/") ? "videos" : "photos"

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")

  const nameSlug = uploaderName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 20)

  const shortId = randomUUID().replace(/-/g, "").slice(0, 8)
  const fileName = `casamento_${dateStr}_${nameSlug}_${shortId}.${ext}`
  const s3Key = `${folder}/${fileName}`

  return { fileName, s3Key }
}

/**
 * POST /api/upload/presign
 * Body: { files: [{ name, type, size }], uploaderName }
 * Retorna: { presignedFiles: [{ uploadUrl, publicUrl, s3Key, fileName, mimeType, fileSize, isVideo }] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { files, uploaderName } = body as {
      files: { name: string; type: string; size: number }[]
      uploaderName: string
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo informado" }, { status: 400 })
    }

    const uploader = uploaderName?.trim() || "convidado"
    const results = []

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Tipo não permitido: ${file.type}` }, { status: 400 })
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Arquivo muito grande: ${file.name}. Máximo 100MB.` },
          { status: 400 }
        )
      }

      const { fileName, s3Key } = generateS3Key(uploader, file.type)
      const { uploadUrl, publicUrl } = await generatePresignedPutUrl(s3Key, file.type)

      results.push({
        uploadUrl,
        publicUrl,
        s3Key,
        fileName,
        mimeType: file.type,
        fileSize: file.size,
        isVideo: file.type.startsWith("video/"),
      })
    }

    return NextResponse.json({ presignedFiles: results })
  } catch (error) {
    console.error("[api/upload/presign] Erro:", error)
    return NextResponse.json({ error: "Falha ao gerar URLs de upload" }, { status: 500 })
  }
}