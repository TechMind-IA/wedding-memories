import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCode } from "@/lib/wedding-context"
import { getPhotosOnlyCount } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode } = await params
  const wedding = await getWeddingByAccessCode(accessCode)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

  try {
    const count = await getPhotosOnlyCount(wedding.id)
    return NextResponse.json({ count })
  } catch (error) {
    console.error("[api/admin/photos/count] Erro:", error)
    return NextResponse.json({ error: "Falha ao contar fotos" }, { status: 500 })
  }
}
