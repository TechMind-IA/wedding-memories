import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCode } from "@/lib/wedding-context"
import { getAllConfig, setConfig } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

const ALLOWED_KEYS = ["gallery_expiration_date", "max_storage_gb", "couple_names", "wedding_date", "whatsapp_number"]
const HIDDEN_KEYS = ["admin_password", "moderation_password", "session_token"]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode } = await params
  const wedding = await getWeddingByAccessCode(accessCode)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

  const redirect = requireAdmin(request, accessCode)
  if (redirect) return redirect

  try {
    const config = await getAllConfig(wedding.id)
    const safeConfig: Record<string, string> = {}
    for (const [key, value] of Object.entries(config)) {
      if (!HIDDEN_KEYS.includes(key)) safeConfig[key] = value
    }
    return NextResponse.json({ config: safeConfig })
  } catch (error) {
    console.error("[api/admin/config] Erro:", error)
    return NextResponse.json({ error: "Falha ao buscar configurações" }, { status: 500 })
  }
}

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
    const { key, value } = body as { key: string; value: string }
    if (!key || value === undefined) return NextResponse.json({ error: "key e value obrigatórios" }, { status: 400 })
    if (!ALLOWED_KEYS.includes(key)) return NextResponse.json({ error: "Configuração não editável" }, { status: 403 })

    await setConfig(wedding.id, key, value)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api/admin/config] Erro:", error)
    return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 })
  }
}
