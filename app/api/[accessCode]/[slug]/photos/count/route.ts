import { NextResponse } from "next/server"
import { getWeddingByAccessCodeAndSlug } from "@/lib/wedding-context"
import { getAllMediaCount } from "@/lib/db"

export const runtime = "edge"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  try {
    const { accessCode, slug } = await params
    const wedding = await getWeddingByAccessCodeAndSlug(accessCode, slug)
    if (!wedding) {
      return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })
    }
    const count = await getAllMediaCount(wedding.id)
    return NextResponse.json({ count })
  } catch (error) {
    console.error("[api/photos/count] Erro:", error)
    return NextResponse.json({ error: "Falha ao contar fotos" }, { status: 500 })
  }
}
