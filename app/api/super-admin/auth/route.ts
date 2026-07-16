import { NextRequest, NextResponse } from "next/server"
import { verifySuperAdminPassword, setSuperAdminSession } from "@/lib/super-admin-auth"
import { checkRateLimit, getRateLimitRemaining } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body as { email: string; password: string }
    if (!email || !password) return NextResponse.json({ error: "Email e senha obrigatórios" }, { status: 400 })

    const ip = request.headers.get("x-forwarded-for") ?? "unknown"
    const rateLimitKey = `super-admin:${ip}`
    if (!checkRateLimit(rateLimitKey, 5, 5 * 60 * 1000)) {
      const remaining = getRateLimitRemaining(rateLimitKey)
      return NextResponse.json({ error: `Muitas tentativas. Tente em ${remaining}s` }, { status: 429 })
    }

    const isValid = await verifySuperAdminPassword(email, password)
    if (!isValid) return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })

    const response = NextResponse.json({ success: true })
    return setSuperAdminSession(response)
  } catch (error) {
    console.error("[api/super-admin/auth] Erro:", error)
    return NextResponse.json({ error: "Falha ao autenticar" }, { status: 500 })
  }
}
