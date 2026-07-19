import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCodeAndSlug } from "@/lib/wedding-context"
import { getPhotosOnlyCount } from "@/lib/db"
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
    const count = await getPhotosOnlyCount(wedding.id)
    return NextResponse.json({ count })
  } catch (error) {
    console.error("[api/admin/photos/count] Erro:", error)
    return NextResponse.json({ error: "Falha ao contar fotos" }, { status: 500 })
  }
}
