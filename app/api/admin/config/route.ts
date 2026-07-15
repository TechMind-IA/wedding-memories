/**
 * Nome: app/api/admin/config/route.ts
 * Função: GET retorna configs (sem senhas), PUT atualiza configs permitidas.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAllConfig, setConfig } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

const ALLOWED_KEYS = ["gallery_expiration_date", "max_storage_gb"]
const HIDDEN_KEYS = ["admin_password", "moderation_password", "session_token"]

export async function GET(request: NextRequest) {
  const redirect = requireAdmin(request)
  if (redirect) return redirect

  try {
    const config = await getAllConfig()
    // Remove senhas da resposta
    const safeConfig: Record<string, string> = {}
    for (const [key, value] of Object.entries(config)) {
      if (!HIDDEN_KEYS.includes(key)) {
        safeConfig[key] = value
      }
    }
    return NextResponse.json({ config: safeConfig })
  } catch (error) {
    console.error("[api/admin/config] Erro:", error)
    return NextResponse.json({ error: "Falha ao buscar configurações" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const redirect = requireAdmin(request)
  if (redirect) return redirect

  try {
    const body = await request.json()
    const { key, value } = body as { key: string; value: string }

    if (!key || value === undefined) {
      return NextResponse.json({ error: "key e value são obrigatórios" }, { status: 400 })
    }

    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json({ error: "Configuração não editável" }, { status: 403 })
    }

    await setConfig(key, value)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api/admin/config] Erro:", error)
    return NextResponse.json({ error: "Falha ao salvar configuração" }, { status: 500 })
  }
}
