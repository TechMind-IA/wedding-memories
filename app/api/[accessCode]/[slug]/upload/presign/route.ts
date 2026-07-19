import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCodeAndSlug } from "@/lib/wedding-context"
import { generateS3Key, generatePresignedPutUrl } from "@/lib/s3"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "video/mp4", "video/webm", "video/quicktime"]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  try {
    const { accessCode, slug } = await params
    const wedding = await getWeddingByAccessCodeAndSlug(accessCode, slug)
    if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

    const body = await request.json()
    const { files, uploaderName } = body as {
      files: { name: string; type: string; size: number }[]
      uploaderName: string
    }

    if (!files || files.length === 0) return NextResponse.json({ error: "Nenhum arquivo informado" }, { status: 400 })

    const uploader = uploaderName?.trim() || "convidado"
    const results = []

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: `Tipo não permitido: ${file.type}` }, { status: 400 })
      if (file.size > 100 * 1024 * 1024) return NextResponse.json({ error: `Arquivo muito grande: ${file.name}` }, { status: 400 })

      const { fileName, s3Key } = generateS3Key(accessCode, uploader, file.type)
      const { uploadUrl, publicUrl } = await generatePresignedPutUrl(s3Key, file.type)
      results.push({ uploadUrl, publicUrl, s3Key, fileName, mimeType: file.type, fileSize: file.size, isVideo: file.type.startsWith("video/") })
    }

    return NextResponse.json({ presignedFiles: results })
  } catch (error) {
    console.error("[api/upload/presign] Erro:", error)
    return NextResponse.json({ error: "Falha ao gerar URLs" }, { status: 500 })
  }
}
