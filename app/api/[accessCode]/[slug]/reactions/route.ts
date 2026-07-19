import { NextRequest, NextResponse } from "next/server"
import { getReactions, getReactionsBatch, toggleReaction, photoBelongsToWedding, photosBelongToWedding } from "@/lib/db"
import { getWeddingByAccessCodeAndSlug } from "@/lib/wedding-context"

export const runtime = "edge"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode, slug } = await params
  const wedding = await getWeddingByAccessCodeAndSlug(accessCode, slug)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

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
      const validIds = await photosBelongToWedding(ids, wedding.id)
      const reactions = await getReactionsBatch(validIds, sessionId)
      return NextResponse.json({ reactions })
    }
    if (photoId) {
      const owns = await photoBelongsToWedding(photoId, wedding.id)
      if (!owns) return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 })
      const reactions = await getReactions(photoId, sessionId)
      return NextResponse.json({ reactions })
    }
    return NextResponse.json({ error: "photo_id ou photo_ids obrigatório" }, { status: 400 })
  } catch (error) {
    console.error("[api/reactions] Erro:", error)
    return NextResponse.json({ error: "Falha ao buscar reações" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode, slug } = await params
  const wedding = await getWeddingByAccessCodeAndSlug(accessCode, slug)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

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
    const owns = await photoBelongsToWedding(photo_id, wedding.id)
    if (!owns) return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 })
    const reactions = await toggleReaction(photo_id, emoji, session_id)
    return NextResponse.json({ reactions })
  } catch (error) {
    console.error("[api/reactions] Erro:", error)
    return NextResponse.json({ error: "Falha ao registrar reação" }, { status: 500 })
  }
}
