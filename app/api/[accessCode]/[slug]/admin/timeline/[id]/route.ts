import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCodeAndSlug } from "@/lib/wedding-context"
import { updateTimelineEvent, deleteTimelineEvent } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string; id: string }> }
) {
  const { accessCode, slug, id } = await params
  const wedding = await getWeddingByAccessCodeAndSlug(accessCode, slug)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

  const redirect = await requireAdmin(request, accessCode, wedding.id)
  if (redirect) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  try {
    const body = await request.json()
    const { label, emoji, start_date, end_date, sort_order } = body as {
      label?: string; emoji?: string; start_date?: string; end_date?: string; sort_order?: number
    }
    const updated = await updateTimelineEvent(wedding.id, id, { label, emoji, start_date, end_date, sort_order })
    if (!updated) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 })
    return NextResponse.json({ event: updated })
  } catch (error) {
    console.error("[api/admin/timeline/[id]] Erro:", error)
    return NextResponse.json({ error: "Falha ao editar evento" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string; id: string }> }
) {
  const { accessCode, slug, id } = await params
  const wedding = await getWeddingByAccessCodeAndSlug(accessCode, slug)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

  const redirect = await requireAdmin(request, accessCode, wedding.id)
  if (redirect) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  try {
    const deleted = await deleteTimelineEvent(wedding.id, id)
    if (!deleted) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api/admin/timeline/[id]] Erro:", error)
    return NextResponse.json({ error: "Falha ao excluir evento" }, { status: 500 })
  }
}
