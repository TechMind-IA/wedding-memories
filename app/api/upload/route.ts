import { NextRequest, NextResponse } from "next/server"
import { uploadToS3 } from "@/lib/s3"
import { insertPhoto } from "@/lib/db"
import { randomUUID } from "crypto"

// Tamanho máximo: 100MB
export const maxDuration = 60

// Extensões e tipos MIME permitidos
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const uploaderName = formData.get("uploaderName") as string | null
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    const uploadedPhotos = []

    for (const file of files) {
      // Validar tipo
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipo de arquivo não permitido: ${file.type}` },
          { status: 400 }
        )
      }

      // Validar tamanho
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Arquivo muito grande: ${file.name}. Máximo 100MB.` },
          { status: 400 }
        )
      }

      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)
      const ext = getExtension(file.type)
      const uniqueId = randomUUID()
      const folder = isVideo ? "videos" : "photos"
      const s3Key = `${folder}/${uniqueId}.${ext}`

      // Converter File → Buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload para S3
      const storageUrl = await uploadToS3(s3Key, buffer, file.type)

      // Salvar metadados no Neon
      const photo = await insertPhoto({
        file_path: s3Key,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_url: storageUrl,
        uploader_name: uploaderName ?? undefined,
        is_video: isVideo,
      })

      uploadedPhotos.push(photo)
    }

    return NextResponse.json({ photos: uploadedPhotos }, { status: 201 })
  } catch (error) {
    console.error("[api/upload] Erro no upload:", error)
    return NextResponse.json(
      { error: "Falha ao fazer upload dos arquivos" },
      { status: 500 }
    )
  }
}