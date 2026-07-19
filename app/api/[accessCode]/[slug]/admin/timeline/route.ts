import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCodeAndSlug } from "@/lib/wedding-context"
import { getTimelineEventsFromDB, createTimelineEvent } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode, slug } = await params
  const wedding = await getWeddingByAccessCodeAndSlug(accessCode, slug)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

  const redirect = await requireAdmin(request, accessCode, wedding.id)
  if (redirect) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  try {
    const events = await getTimelineEventsFromDB(wedding.id)
    return NextResponse.json({ events })
  } catch (error) {
    console.error("[api/admin/timeline] Erro:", error)
    return NextResponse.json({ error: "Falha ao buscar eventos" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode, slug } = await params
  const wedding = await getWeddingByAccessCodeAndSlug(accessCode, slug)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

  const redirect = await requireAdmin(request, accessCode, wedding.id)
  if (redirect) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  try {
    const body = await request.json()
    const { label, emoji, start_date, end_date, sort_order } = body as {
      label: string; emoji: string; start_date: string; end_date: string; sort_order?: number
    }
    if (!label || !emoji || !start_date || !end_date) {
      return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 })
    }
    if (new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json({ error: "end_date deve ser posterior a start_date" }, { status: 400 })
    }
    const event = await createTimelineEvent(wedding.id, { label, emoji, start_date, end_date, sort_order })
    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error("[api/admin/timeline] Erro:", error)
    return NextResponse.json({ error: "Falha ao criar evento" }, { status: 500 })
  }
}
