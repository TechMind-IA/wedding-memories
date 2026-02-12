import { NextResponse } from "next/server"
import { getAllPhotos } from "@/lib/db"

export const runtime = "edge"

export async function GET() {
  try {
    const photos = await getAllPhotos()
    return NextResponse.json({ photos })
  } catch (error) {
    console.error("[api/photos] Erro ao buscar fotos:", error)
    return NextResponse.json(
      { error: "Falha ao buscar fotos" },
      { status: 500 }
    )
  }
}