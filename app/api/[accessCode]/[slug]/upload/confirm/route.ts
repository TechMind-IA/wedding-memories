import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCode } from "@/lib/wedding-context"
import { insertPhoto } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  try {
    const { accessCode } = await params
    const wedding = await getWeddingByAccessCode(accessCode)
    if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

    const body = await request.json()
    const { uploaderName, photos } = body as {
      uploaderName: string
      photos: { s3Key: string; fileName: string; publicUrl: string; mimeType: string; fileSize: number; isVideo: boolean; date_taken?: string | null; latitude?: number | null; longitude?: number | null }[]
    }

    if (!photos || photos.length === 0) return NextResponse.json({ error: "Nenhuma foto para confirmar" }, { status: 400 })

    const uploader = uploaderName?.trim() || "convidado"
    const savedPhotos = []
    for (const photo of photos) {
      const record = await insertPhoto(wedding.id, {
        file_path: photo.s3Key, file_name: photo.fileName, file_size: photo.fileSize,
        mime_type: photo.mimeType, storage_url: photo.publicUrl, s3_key: photo.s3Key,
        uploader_name: uploader, is_video: photo.isVideo,
        date_taken: photo.date_taken ?? undefined, latitude: photo.latitude ?? undefined, longitude: photo.longitude ?? undefined,
      })
      savedPhotos.push(record)
    }

    return NextResponse.json({ photos: savedPhotos }, { status: 201 })
  } catch (error) {
    console.error("[api/upload/confirm] Erro:", error)
    return NextResponse.json({ error: "Falha ao salvar metadados" }, { status: 500 })
  }
}
