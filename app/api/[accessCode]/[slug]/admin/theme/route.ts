/**
 * Nome: app/api/[accessCode]/[slug]/admin/theme/route.ts
 * Função: Atualiza a cor do tema (theme_color) na tabela weddings.
 */

import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCodeAndSlug, clearWeddingCache } from "@/lib/wedding-context"
import { updateWedding } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"
import { validateHex } from "@/lib/color-utils"

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
    const { themeColor } = body as { themeColor: string }

    if (!themeColor) {
      return NextResponse.json({ error: "themeColor obrigatório" }, { status: 400 })
    }

    const validatedColor = validateHex(themeColor)
    const updated = await updateWedding(wedding.id, { themeColor: validatedColor })
    if (!updated) {
      return NextResponse.json({ error: "Falha ao atualizar" }, { status: 500 })
    }

    clearWeddingCache(accessCode)
    return NextResponse.json({ success: true, themeColor: validatedColor })
  } catch (error) {
    console.error("[api/admin/theme] Erro:", error)
    return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 })
  }
}
