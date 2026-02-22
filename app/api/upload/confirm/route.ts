import { NextRequest, NextResponse } from "next/server"
import { insertPhoto } from "@/lib/db"

/**
 * POST /api/upload/confirm
 * Body: { uploaderName, photos: [{ s3Key, fileName, publicUrl, mimeType, fileSize, isVideo, date_taken, latitude, longitude }] }
 * Chamado após o cliente ter feito o PUT direto no S3 com a presigned URL.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uploaderName, photos } = body as {
      uploaderName: string
      photos: {
        s3Key: string
        fileName: string
        publicUrl: string
        mimeType: string
        fileSize: number
        isVideo: boolean
        date_taken?: string | null
        latitude?: number | null
        longitude?: number | null
      }[]
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: "Nenhuma foto para confirmar" }, { status: 400 })
    }

    const uploader = uploaderName?.trim() || "convidado"
    const savedPhotos = []

    for (const photo of photos) {
      console.log(`[api/upload/confirm] Salvando ${photo.fileName} → date_taken: ${photo.date_taken ?? "nenhum"}, GPS: ${photo.latitude}, ${photo.longitude}`)

      const record = await insertPhoto({
        file_path: photo.s3Key,
        file_name: photo.fileName,
        file_size: photo.fileSize,
        mime_type: photo.mimeType,
        storage_url: photo.publicUrl,
        s3_key: photo.s3Key,
        uploader_name: uploader,
        is_video: photo.isVideo,
        date_taken: photo.date_taken ?? undefined,
        latitude: photo.latitude ?? undefined,
        longitude: photo.longitude ?? undefined,
      })
      savedPhotos.push(record)
    }

    return NextResponse.json({ photos: savedPhotos }, { status: 201 })
  } catch (error) {
    console.error("[api/upload/confirm] Erro:", error)
    return NextResponse.json({ error: "Falha ao salvar metadados" }, { status: 500 })
  }
}
