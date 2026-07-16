import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCode } from "@/lib/wedding-context"
import { reorderTimelineEvents } from "@/lib/db"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode } = await params
  const wedding = await getWeddingByAccessCode(accessCode)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

  try {
    const body = await request.json()
    const { ids } = body as { ids: string[] }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids obrigatório" }, { status: 400 })
    }
    await reorderTimelineEvents(wedding.id, ids)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api/admin/timeline/reorder] Erro:", error)
    return NextResponse.json({ error: "Falha ao reordenar" }, { status: 500 })
  }
}
