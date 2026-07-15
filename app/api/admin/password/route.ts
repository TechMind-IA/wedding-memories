/**
 * Nome: app/api/admin/password/route.ts
 * Função: PUT altera senha do admin ou de moderação.
 */

import { NextRequest, NextResponse } from "next/server"
import { getConfig, setConfig } from "@/lib/db"
import { requireAdmin, verifyAdminPassword, invalidateSession } from "@/lib/admin-auth"

export async function PUT(request: NextRequest) {
  const redirect = requireAdmin(request)
  if (redirect) return redirect

  try {
    const body = await request.json()
    const { type, currentPassword, newPassword } = body as {
      type: "admin" | "moderation"
      currentPassword: string
      newPassword: string
    }

    if (!type || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "type, currentPassword e newPassword são obrigatórios" },
        { status: 400 }
      )
    }

    if (newPassword.length < 4 || newPassword.length > 100) {
      return NextResponse.json(
        { error: "Nova senha deve ter entre 4 e 100 caracteres" },
        { status: 400 }
      )
    }

    if (type === "admin") {
      const isValid = await verifyAdminPassword(currentPassword)
      if (!isValid) {
        return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 })
      }
      await setConfig("admin_password", newPassword)
      await invalidateSession()
    } else if (type === "moderation") {
      const currentModPassword = await getConfig("moderation_password")
      if (currentPassword !== currentModPassword) {
        return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 })
      }
      await setConfig("moderation_password", newPassword)
    } else {
      return NextResponse.json({ error: "type inválido" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api/admin/password] Erro:", error)
    return NextResponse.json({ error: "Falha ao alterar senha" }, { status: 500 })
  }
}
