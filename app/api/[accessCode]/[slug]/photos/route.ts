import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCode } from "@/lib/wedding-context"
import { getPhotosPage } from "@/lib/db"

export const runtime = "edge"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  try {
    const { accessCode } = await params
    const wedding = await getWeddingByAccessCode(accessCode)
    if (!wedding) {
      return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get("limit") ?? 40)
    const cursor = searchParams.get("cursor")
    const result = await getPhotosPage(wedding.id, limit, cursor)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[api/photos] Erro:", error)
    return NextResponse.json({ error: "Falha ao buscar fotos" }, { status: 500 })
  }
}
