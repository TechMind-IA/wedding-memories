import { PutObjectCommand } from "@aws-sdk/client-s3"
import s3Client from "@/lib/s3-client"
import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

const PHOTOS_DB_FILE = "/tmp/photos.json"

async function getPhotosDatabase() {
  try {
    const data = await fs.readFile(PHOTOS_DB_FILE, "utf-8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function savePhotosDatabase(photos: any[]) {
  await fs.writeFile(PHOTOS_DB_FILE, JSON.stringify(photos, null, 2))
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Upload API: Starting request processing")
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const uploaderName = formData.get("uploader_name") as string

    console.log("[v0] Received files:", files.length, "uploader:", uploaderName)

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    if (!uploaderName || uploaderName.trim() === "") {
      return NextResponse.json(
        { error: "Uploader name is required" },
        { status: 400 }
      )
    }

    const bucketName = process.env.AWS_S3_BUCKET || "wedding-photos"
    const uploadedUrls: string[] = []
    const photosDb = await getPhotosDatabase()

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileType = (formData.get(`file_type_${i}`) as string) || "image"
      const isVideo = fileType === "video"

      const sanitizedFileName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.-]/g, "_")
        .replace(/_{2,}/g, "_")

      const fileName = `${Date.now()}-${i}-${sanitizedFileName}`
      const fileKey = `wedding-photos/${fileName}`

      console.log(
        `[v0] Processing file ${i}:`,
        file.name,
        "type:",
        file.type
      )

      if (file.size > 100 * 1024 * 1024) {
        console.error(`[v0] File too large: ${file.name}`)
        continue
      }

      try {
        const buffer = await file.arrayBuffer()
        const uploadCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
          Body: Buffer.from(buffer),
          ContentType: file.type,
          ACL: "public-read",
        })

        await s3Client.send(uploadCommand)
        console.log(`[v0] S3 upload successful for ${file.name}`)

        const photoUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`
        console.log(`[v0] Public URL: ${photoUrl}`)

        // Save to local database
        const photoRecord = {
          id: `${Date.now()}-${i}`,
          created_at: new Date().toISOString(),
          file_path: fileKey,
          file_name: file.name.substring(0, 255),
          file_size: file.size,
          mime_type: (file.type || "application/octet-stream").substring(0, 100),
          storage_url: photoUrl,
          uploader_name: uploaderName.trim().substring(0, 255),
          is_video: isVideo,
        }

        photosDb.push(photoRecord)
        uploadedUrls.push(photoUrl)
        console.log(`[v0] Successfully uploaded: ${file.name}`)
      } catch (error) {
        console.error(`[v0] Upload error for ${file.name}:`, error)
        continue
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: "Failed to upload files" },
        { status: 500 }
      )
    }

    // Save photos database
    await savePhotosDatabase(photosDb)
    console.log("[v0] Total files uploaded:", uploadedUrls.length)

    return NextResponse.json(
      { success: true, urls: uploadedUrls },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
