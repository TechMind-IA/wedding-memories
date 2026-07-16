import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCode } from "@/lib/wedding-context"
import { insertPhoto } from "@/lib/db"
import { uploadToS3, generateS3Key } from "@/lib/s3"
import { extractExif } from "@/lib/exif"

export const maxDuration = 60
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "video/mp4", "video/webm", "video/quicktime"]
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  try {
    const { accessCode } = await params
    const wedding = await getWeddingByAccessCode(accessCode)
    if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

    const formData = await request.formData()
    const uploaderName = (formData.get("uploaderName") as string | null) ?? "convidado"
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })

    const uploadedPhotos = []
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: `Tipo não permitido: ${file.type}` }, { status: 400 })
      if (file.size > 100 * 1024 * 1024) return NextResponse.json({ error: `Arquivo muito grande: ${file.name}` }, { status: 400 })

      const isVideo = VIDEO_TYPES.includes(file.type)
      const buffer = Buffer.from(await file.arrayBuffer())
      const exif = await extractExif(buffer, file.type)
      const { fileName, s3Key } = generateS3Key(accessCode, uploaderName, file.type, exif.date_taken)
      const storageUrl = await uploadToS3(s3Key, buffer, file.type)

      const photo = await insertPhoto(wedding.id, {
        file_path: s3Key, file_name: fileName, file_size: file.size, mime_type: file.type,
        storage_url: storageUrl, s3_key: s3Key, uploader_name: uploaderName, is_video: isVideo,
        date_taken: exif.date_taken, latitude: exif.latitude, longitude: exif.longitude,
      })
      uploadedPhotos.push(photo)
    }

    return NextResponse.json({ photos: uploadedPhotos }, { status: 201 })
  } catch (error) {
    console.error("[api/upload] Erro:", error)
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 })
  }
}
