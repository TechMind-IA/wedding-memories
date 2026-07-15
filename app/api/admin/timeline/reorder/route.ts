/**
 * Nome: app/api/admin/timeline/reorder/route.ts
 * Função: PUT reordena eventos da timeline.
 */

import { NextRequest, NextResponse } from "next/server"
import { reorderTimelineEvents } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export async function PUT(request: NextRequest) {
  const redirect = requireAdmin(request)
  if (redirect) return redirect

  try {
    const body = await request.json()
    const { ids } = body as { ids: string[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids é obrigatório e deve ser um array" }, { status: 400 })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!ids.every((id) => typeof id === "string" && uuidRegex.test(id))) {
      return NextResponse.json({ error: "IDs devem ser UUIDs válidos" }, { status: 400 })
    }

    await reorderTimelineEvents(ids)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api/admin/timeline/reorder] Erro:", error)
    return NextResponse.json({ error: "Falha ao reordenar eventos" }, { status: 500 })
  }
}
