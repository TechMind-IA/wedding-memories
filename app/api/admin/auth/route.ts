/**
 * Nome: app/api/admin/auth/route.ts
 * Função: Login do painel admin — valida senha, seta cookie com token randomizado, rate limiting.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAdminPassword, setAdminSession } from "@/lib/admin-auth"
import { checkRateLimit, getRateLimitRemaining } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body as { password: string }

    if (!password) {
      return NextResponse.json({ error: "Senha é obrigatória" }, { status: 400 })
    }

    // Rate limiting: 5 tentativas por 5 minutos
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown"
    const rateLimitKey = `login:${ip}`

    if (!checkRateLimit(rateLimitKey, 5, 5 * 60 * 1000)) {
      const remaining = getRateLimitRemaining(rateLimitKey)
      return NextResponse.json(
        { error: `Muitas tentativas. Tente novamente em ${remaining} segundos` },
        { status: 429 }
      )
    }

    const isValid = await verifyAdminPassword(password)
    if (!isValid) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    return setAdminSession(response)
  } catch (error) {
    console.error("[api/admin/auth] Erro:", error)
    return NextResponse.json({ error: "Falha ao autenticar" }, { status: 500 })
  }
}
