import { NextRequest, NextResponse } from "next/server"
import { uploadToS3 } from "@/lib/s3"
import { insertPhoto } from "@/lib/db"
import { extractExif } from "@/lib/exif"
import { randomUUID } from "crypto"

export const maxDuration = 60

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

/**
 * Gera nome padronizado para o arquivo.
 * Formato: casamento_YYYYMMDD_[nome-slug]_[uuid-curto].[ext]
 * Ex: casamento_20261215_joao-silva_a1b2c3d4.jpg
 */
function generateFileName(uploaderName: string, mimeType: string, dateTaken?: string) {
  const ext = getExtension(mimeType)
  const folder = mimeType.startsWith("video/") ? "videos" : "photos"

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

  const shortId = randomUUID().replace(/-/g, "").slice(0, 8)
  const fileName = `casamento_${dateStr}_${nameSlug}_${shortId}.${ext}`
  const s3Key = `${folder}/${fileName}`

  return { fileName, s3Key }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const uploaderName = (formData.get("uploaderName") as string | null) ?? "convidado"
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    const uploadedPhotos = []

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Tipo não permitido: ${file.type}` }, { status: 400 })
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `Arquivo muito grande: ${file.name}. Máximo 100MB.` }, { status: 400 })
      }

      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Extrai data e GPS do EXIF
      const exif = await extractExif(buffer, file.type)

      // Gera nome usando data EXIF se disponível
      const { fileName, s3Key } = generateFileName(uploaderName, file.type, exif.date_taken)

      // Faz upload com o nome novo
      const storageUrl = await uploadToS3(s3Key, buffer, file.type)

      // Salva no banco
      const photo = await insertPhoto({
        file_path: s3Key,
        file_name: fileName,
        file_size: file.size,
        mime_type: file.type,
        storage_url: storageUrl,
        s3_key: s3Key,
        uploader_name: uploaderName,
        is_video: isVideo,
        date_taken: exif.date_taken,
        latitude: exif.latitude,
        longitude: exif.longitude,
      })

      uploadedPhotos.push(photo)
    }

    return NextResponse.json({ photos: uploadedPhotos }, { status: 201 })
  } catch (error) {
    console.error("[api/upload] Erro:", error)
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 })
  }
}
