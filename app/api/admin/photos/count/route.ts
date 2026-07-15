/**
 * Nome: app/api/admin/photos/count/route.ts
 * Função: Retorna contagem total de fotos (não vídeos).
 */

import { NextRequest, NextResponse } from "next/server"
import { getPhotosOnlyCount } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const redirect = requireAdmin(request)
  if (redirect) return redirect

  try {
    const count = await getPhotosOnlyCount()
    return NextResponse.json({ count })
  } catch (error) {
    console.error("[api/admin/photos/count] Erro:", error)
    return NextResponse.json({ error: "Falha ao contar fotos" }, { status: 500 })
  }
}
