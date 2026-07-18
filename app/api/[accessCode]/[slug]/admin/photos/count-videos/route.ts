import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCode } from "@/lib/wedding-context"
import { getVideosCount, getTotalStorageUsed } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode } = await params
  const wedding = await getWeddingByAccessCode(accessCode)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

  const redirect = await requireAdmin(request, accessCode, wedding.id)
  if (redirect) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  try {
    const [videosCount, storageUsed] = await Promise.all([
      getVideosCount(wedding.id),
      getTotalStorageUsed(wedding.id),
    ])
    return NextResponse.json({ videosCount, storageUsed, storageUsedGB: (storageUsed / (1024 * 1024 * 1024)).toFixed(2) })
  } catch (error) {
    console.error("[api/admin/photos/count-videos] Erro:", error)
    return NextResponse.json({ error: "Falha ao contar vídeos" }, { status: 500 })
  }
}
