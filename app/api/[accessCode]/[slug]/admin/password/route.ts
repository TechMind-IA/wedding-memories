import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCode } from "@/lib/wedding-context"
import { getConfig, setConfig } from "@/lib/db"
import { requireAdmin, verifyAdminPassword, invalidateSession } from "@/lib/admin-auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode } = await params
  const wedding = await getWeddingByAccessCode(accessCode)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

  const redirect = requireAdmin(request, accessCode)
  if (redirect) return redirect

  try {
    const body = await request.json()
    const { type, currentPassword, newPassword } = body as {
      type: "admin" | "moderation"; currentPassword: string; newPassword: string
    }
    if (!type || !currentPassword || !newPassword) return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 })
    if (newPassword.length < 4 || newPassword.length > 100) return NextResponse.json({ error: "Nova senha deve ter 4-100 caracteres" }, { status: 400 })

    if (type === "admin") {
      const isValid = await verifyAdminPassword(wedding.id, currentPassword)
      if (!isValid) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 })
      await setConfig(wedding.id, "admin_password", newPassword)
      await invalidateSession(wedding.id)
    } else if (type === "moderation") {
      const currentModPassword = await getConfig(wedding.id, "moderation_password")
      if (currentPassword !== currentModPassword) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 })
      await setConfig(wedding.id, "moderation_password", newPassword)
    } else {
      return NextResponse.json({ error: "type inválido" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api/admin/password] Erro:", error)
    return NextResponse.json({ error: "Falha ao alterar senha" }, { status: 500 })
  }
}
