/**
 * Nome: app/api/admin/timeline/route.ts
 * Função: GET lista eventos, POST cria novo evento.
 */

import { NextRequest, NextResponse } from "next/server"
import { getTimelineEventsFromDB, createTimelineEvent } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const redirect = requireAdmin(request)
  if (redirect) return redirect

  try {
    const events = await getTimelineEventsFromDB()
    return NextResponse.json({ events })
  } catch (error) {
    console.error("[api/admin/timeline] Erro:", error)
    return NextResponse.json({ error: "Falha ao buscar eventos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const redirect = requireAdmin(request)
  if (redirect) return redirect

  try {
    const body = await request.json()
    const { label, emoji, start_date, end_date, sort_order } = body as {
      label: string
      emoji: string
      start_date: string
      end_date: string
      sort_order?: number
    }

    if (!label || !emoji || !start_date || !end_date) {
      return NextResponse.json(
        { error: "label, emoji, start_date e end_date são obrigatórios" },
        { status: 400 }
      )
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json(
        { error: "end_date deve ser posterior a start_date" },
        { status: 400 }
      )
    }

    const event = await createTimelineEvent({ label, emoji, start_date, end_date, sort_order })
    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error("[api/admin/timeline] Erro:", error)
    return NextResponse.json({ error: "Falha ao criar evento" }, { status: 500 })
  }
}
