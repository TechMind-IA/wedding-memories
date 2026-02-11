import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"

const PHOTOS_DB_FILE = "/tmp/photos.json"

async function getPhotosDatabase() {
  try {
    const data = await fs.readFile(PHOTOS_DB_FILE, "utf-8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Photos API: Fetching photos")
    const photos = await getPhotosDatabase()

    // Sort by created_at descending
    const sortedPhotos = photos.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    console.log("[v0] Fetched photos:", sortedPhotos.length)
    return NextResponse.json({ photos: sortedPhotos }, { status: 200 })
  } catch (error) {
    console.error("[v0] Photos API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
