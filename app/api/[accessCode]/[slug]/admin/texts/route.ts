/**
 * Nome: app/api/[accessCode]/[slug]/admin/texts/route.ts
 * Função: API para leitura e escrita dos textos customizados (custom_texts).
 */

import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCodeAndSlug, clearWeddingCache } from "@/lib/wedding-context"
import { getConfig, setConfig } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode, slug } = await params
  const wedding = await getWeddingByAccessCodeAndSlug(accessCode, slug)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

  const redirect = await requireAdmin(request, accessCode, wedding.id)
  if (redirect) return redirect

  try {
    const raw = await getConfig(wedding.id, "custom_texts")
    const texts = raw ? JSON.parse(raw) : {}
    return NextResponse.json({ texts })
  } catch (error) {
    console.error("[api/admin/texts] Erro:", error)
    return NextResponse.json({ texts: {} })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode, slug } = await params
  const wedding = await getWeddingByAccessCodeAndSlug(accessCode, slug)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

  const redirect = await requireAdmin(request, accessCode, wedding.id)
  if (redirect) return redirect

  try {
    const body = await request.json()
    const { texts } = body as { texts: Record<string, string> }

    if (!texts || typeof texts !== "object") {
      return NextResponse.json({ error: "texts obrigatório (object)" }, { status: 400 })
    }

    const jsonValue = JSON.stringify(texts)
    await setConfig(wedding.id, "custom_texts", jsonValue)
    clearWeddingCache(accessCode)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api/admin/texts] Erro:", error)
    return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 })
  }
}
