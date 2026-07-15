/**
 * Nome: middleware.ts
 * Função: Protege rotas /admin e /api/admin no servidor.
 */

import { NextRequest, NextResponse } from "next/server"

const COOKIE_NAME = "admin_session"

function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin")
}

function isLoginRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname === "/api/admin/auth" || pathname === "/api/admin/auth/check"
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas que não precisam de auth
  if (!isAdminRoute(pathname) || isLoginRoute(pathname)) {
    return NextResponse.next()
  }

  // Verifica cookie de sessão (checagem básica — validação completa happens nos route handlers)
  const session = request.cookies.get(COOKIE_NAME)
  if (session?.value && session.value.length > 0) {
    return NextResponse.next()
  }

  // Redireciona para login (rotas de API retornam 401)
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const loginUrl = new URL("/admin", request.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
