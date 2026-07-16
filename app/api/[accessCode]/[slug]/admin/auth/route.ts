import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCode } from "@/lib/wedding-context"
import { verifyAdminPassword, setAdminSession } from "@/lib/admin-auth"
import { checkRateLimit, getRateLimitRemaining } from "@/lib/rate-limit"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  try {
    const { accessCode } = await params
    const wedding = await getWeddingByAccessCode(accessCode)
    if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

    const body = await request.json()
    const { password } = body as { password: string }
    if (!password) return NextResponse.json({ error: "Senha é obrigatória" }, { status: 400 })

    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown"
    const rateLimitKey = `login:${accessCode}:${ip}`
    if (!checkRateLimit(rateLimitKey, 5, 5 * 60 * 1000)) {
      const remaining = getRateLimitRemaining(rateLimitKey)
      return NextResponse.json({ error: `Muitas tentativas. Tente novamente em ${remaining} segundos` }, { status: 429 })
    }

    const isValid = await verifyAdminPassword(wedding.id, password)
    if (!isValid) return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })

    const response = NextResponse.json({ success: true })
    return setAdminSession(response, accessCode, wedding.id)
  } catch (error) {
    console.error("[api/admin/auth] Erro:", error)
    return NextResponse.json({ error: "Falha ao autenticar" }, { status: 500 })
  }
}
