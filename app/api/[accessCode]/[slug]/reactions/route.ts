import { NextRequest, NextResponse } from "next/server"
import { getReactions, getReactionsBatch, toggleReaction } from "@/lib/db"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("session_id")
  const photoId = searchParams.get("photo_id")
  const photoIds = searchParams.get("photo_ids")

  if (!sessionId) {
    return NextResponse.json({ error: "session_id obrigatório" }, { status: 400 })
  }

  try {
    if (photoIds) {
      const ids = photoIds.split(",").filter(Boolean)
      const reactions = await getReactionsBatch(ids, sessionId)
      return NextResponse.json({ reactions })
    }
    if (photoId) {
      const reactions = await getReactions(photoId, sessionId)
      return NextResponse.json({ reactions })
    }
    return NextResponse.json({ error: "photo_id ou photo_ids obrigatório" }, { status: 400 })
  } catch (error) {
    console.error("[api/reactions] Erro:", error)
    return NextResponse.json({ error: "Falha ao buscar reações" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { photo_id, emoji, session_id } = body as {
      photo_id: string; emoji: string; session_id: string
    }
    if (!photo_id || !emoji || !session_id) {
      return NextResponse.json({ error: "photo_id, emoji e session_id obrigatórios" }, { status: 400 })
    }
    const ALLOWED_EMOJIS = ["❤️", "😍", "😂", "👏", "🔥"]
    if (!ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: "Emoji não permitido" }, { status: 400 })
    }
    const reactions = await toggleReaction(photo_id, emoji, session_id)
    return NextResponse.json({ reactions })
  } catch (error) {
    console.error("[api/reactions] Erro:", error)
    return NextResponse.json({ error: "Falha ao registrar reação" }, { status: 500 })
  }
}
