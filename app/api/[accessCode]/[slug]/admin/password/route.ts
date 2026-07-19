import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCodeAndSlug } from "@/lib/wedding-context"
import { setConfig } from "@/lib/db"
import { requireAdmin, verifyAdminPassword, verifyModerationPassword, invalidateSession } from "@/lib/admin-auth"
import { hash } from "bcryptjs"

const SALT_ROUNDS = 10

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
    const { type, currentPassword, newPassword } = body as {
      type: "admin" | "moderation"; currentPassword: string; newPassword: string
    }
    if (!type || !currentPassword || !newPassword) return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 })
    if (newPassword.length < 4 || newPassword.length > 100) return NextResponse.json({ error: "Nova senha deve ter 4-100 caracteres" }, { status: 400 })

    if (type === "admin") {
      const isValid = await verifyAdminPassword(wedding.id, currentPassword)
      if (!isValid) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 })
      const hashedPassword = await hash(newPassword, SALT_ROUNDS)
      await setConfig(wedding.id, "admin_password", hashedPassword)
      await invalidateSession(wedding.id)
    } else if (type === "moderation") {
      const isValid = await verifyModerationPassword(wedding.id, currentPassword)
      if (!isValid) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 })
      const hashedPassword = await hash(newPassword, SALT_ROUNDS)
      await setConfig(wedding.id, "moderation_password", hashedPassword)
    } else {
      return NextResponse.json({ error: "type inválido" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api/admin/password] Erro:", error)
    return NextResponse.json({ error: "Falha ao alterar senha" }, { status: 500 })
  }
}
