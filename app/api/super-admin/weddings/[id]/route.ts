import { NextRequest, NextResponse } from "next/server"
import { isSuperAdminAuthenticated } from "@/lib/super-admin-auth"
import { updateWedding, deleteWedding } from "@/lib/db"
import { clearWeddingCache } from "@/lib/wedding-context"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isSuperAdminAuthenticated(request))) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    const { slug, coupleNames, weddingDate, themeColor, isActive } = body as {
      slug?: string; coupleNames?: string; weddingDate?: string; themeColor?: string; isActive?: boolean
    }
    const updated = await updateWedding(id, { slug, coupleNames, weddingDate, themeColor, isActive })
    if (!updated) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })
    clearWeddingCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api/super-admin/weddings/[id]] Erro:", error)
    return NextResponse.json({ error: "Falha ao editar" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isSuperAdminAuthenticated(request))) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  try {
    const { id } = await params
    const deleted = await deleteWedding(id)
    if (!deleted) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })
    clearWeddingCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api/super-admin/weddings/[id]] Erro:", error)
    return NextResponse.json({ error: "Falha ao excluir" }, { status: 500 })
  }
}
