/**
 * Nome: app/api/admin/timeline/[id]/route.ts
 * Função: PUT edita evento, DELETE exclui evento.
 */

import { NextRequest, NextResponse } from "next/server"
import { updateTimelineEvent, deleteTimelineEvent } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const redirect = requireAdmin(request)
  if (redirect) return redirect

  try {
    const { id } = await params
    const body = await request.json()
    const { label, emoji, start_date, end_date, sort_order } = body as {
      label?: string
      emoji?: string
      start_date?: string
      end_date?: string
      sort_order?: number
    }

    const updated = await updateTimelineEvent(id, {
      label,
      emoji,
      start_date,
      end_date,
      sort_order,
    })

    if (!updated) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ event: updated })
  } catch (error) {
    console.error("[api/admin/timeline/[id]] Erro:", error)
    return NextResponse.json({ error: "Falha ao editar evento" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const redirect = requireAdmin(request)
  if (redirect) return redirect

  try {
    const { id } = await params
    const deleted = await deleteTimelineEvent(id)

    if (!deleted) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api/admin/timeline/[id]] Erro:", error)
    return NextResponse.json({ error: "Falha ao excluir evento" }, { status: 500 })
  }
}
