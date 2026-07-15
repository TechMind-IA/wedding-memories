import { NextResponse } from "next/server"
import { getAllPhotos } from "@/lib/db"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { ZipArchive } from "archiver"
import { Readable } from "stream"

export async function GET() {
  try {
    const photos = await getAllPhotos()

    if (photos.length === 0) {
      return NextResponse.json({ error: "Nenhuma mídia encontrada" }, { status: 404 })
    }

    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })

    const bucket = process.env.AWS_S3_BUCKET_NAME!
    const archiver = new ZipArchive({ zlib: { level: 0 } })

    archiver.on("warning", (err) => {
      if (err.code === "ENOENT") console.warn("[archiver]", err)
      else throw err
    })

    for (const photo of photos) {
      if (!photo.s3_key) {
        console.warn(`[download-all] Foto sem s3_key: ${photo.id}`)
        continue
      }
      try {
        const command = new GetObjectCommand({ Bucket: bucket, Key: photo.s3_key })
        const response = await s3Client.send(command)
        if (!response.Body) {
          console.warn(`[download-all] Body vazio para ${photo.s3_key}`)
          continue
        }
        archiver.append(response.Body as Readable, { name: photo.file_name })
      } catch (err) {
        console.error(`[download-all] Erro ao ler ${photo.s3_key}:`, err)
      }
    }

    archiver.finalize()

    const webStream = new ReadableStream({
      start(controller) {
        archiver.on("data", (chunk: Buffer) => controller.enqueue(chunk))
        archiver.on("end", () => controller.close())
        archiver.on("error", (err: Error) => controller.error(err))
      },
      cancel() {
        archiver.destroy()
      },
    })

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="midias-galeria.zip"`,
      },
    })
  } catch (error) {
    console.error("[api/download-all] Erro:", error)
    return NextResponse.json({ error: "Falha ao gerar download" }, { status: 500 })
  }
}
