/**
 * Nome: app/api/admin/photos/count-videos/route.ts
 * Função: Retorna contagem total de vídeos.
 */

import { NextRequest, NextResponse } from "next/server"
import { getVideosCount, getTotalStorageUsed } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const redirect = requireAdmin(request)
  if (redirect) return redirect

  try {
    const [videosCount, storageUsed] = await Promise.all([
      getVideosCount(),
      getTotalStorageUsed(),
    ])

    return NextResponse.json({
      videosCount,
      storageUsed,
      storageUsedGB: (storageUsed / (1024 * 1024 * 1024)).toFixed(2),
    })
  } catch (error) {
    console.error("[api/admin/photos/count-videos] Erro:", error)
    return NextResponse.json({ error: "Falha ao contar vídeos" }, { status: 500 })
  }
}
