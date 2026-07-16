import { NextResponse } from "next/server"
import { getWeddingByAccessCode } from "@/lib/wedding-context"
import { getAllPhotos } from "@/lib/db"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { ZipArchive } from "archiver"
import { Readable } from "stream"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  try {
    const { accessCode } = await params
    const wedding = await getWeddingByAccessCode(accessCode)
    if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

    const photos = await getAllPhotos(wedding.id)
    if (photos.length === 0) return NextResponse.json({ error: "Nenhuma mídia encontrada" }, { status: 404 })

    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! },
    })
    const bucket = process.env.AWS_S3_BUCKET_NAME!
    const archive = new ZipArchive({ zlib: { level: 0 } })

    for (const photo of photos) {
      if (!photo.s3_key) continue
      try {
        const command = new GetObjectCommand({ Bucket: bucket, Key: photo.s3_key })
        const response = await s3Client.send(command)
        if (!response.Body) continue
        archive.append(response.Body as Readable, { name: photo.file_name })
      } catch (err) {
        console.error(`[download-all] Erro ao ler ${photo.s3_key}:`, err)
      }
    }

    archive.finalize()
    const webStream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk: Buffer) => controller.enqueue(chunk))
        archive.on("end", () => controller.close())
        archive.on("error", (err: Error) => controller.error(err))
      },
      cancel() { archive.destroy() },
    })

    return new NextResponse(webStream, {
      headers: { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="midias-galeria.zip"' },
    })
  } catch (error) {
    console.error("[api/download-all] Erro:", error)
    return NextResponse.json({ error: "Falha ao gerar download" }, { status: 500 })
  }
}
