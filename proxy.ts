/**
 * Nome: middleware.ts
 * Função: Roteamento multi-tenant.
 * - /[accessCode]/[slug]/* → rotas do casamento (valida hex + slug)
 * - /[accessCode]/[slug]/admin/* → protegido por auth do casamento
 * - /super-admin/* → protegido por auth do super-admin
 * - /api/[accessCode]/[slug]/* → APIs do casamento
 * - /api/super-admin/* → APIs do super-admin
 */

import { NextRequest, NextResponse } from "next/server"

const SUPER_ADMIN_COOKIE = "super_admin_session"

function getAdminCookieName(accessCode: string): string {
  return `admin_session_${accessCode}`
}

function isValidAccessCode(code: string): boolean {
  return /^[0-9a-f]{12}$/.test(code)
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug)
}

function isValidTokenFormat(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const segments = pathname.split("/").filter(Boolean)

  // ── Super Admin routes ──────────────────────────────────────────────────────
  if (segments[0] === "super-admin" || (segments[0] === "api" && segments[1] === "super-admin")) {
    // Login page não precisa de auth
    if (segments[0] === "super-admin" && segments.length === 1) {
      return NextResponse.next()
    }
    // Auth check
    if (segments[0] === "api" && segments.slice(1, 3).join("/") === "super-admin/auth") {
      return NextResponse.next()
    }

    const cookie = request.cookies.get(SUPER_ADMIN_COOKIE)
    if (!cookie?.value || !isValidTokenFormat(cookie.value)) {
      if (segments[0] === "api") {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
      }
      return NextResponse.redirect(new URL("/super-admin", request.url))
    }
    return NextResponse.next()
  }

  // ── API routes for weddings ─────────────────────────────────────────────────
  if (segments[0] === "api" && segments.length >= 4) {
    // /api/{accessCode}/{slug}/...
    const accessCode = segments[1]
    const slug = segments[2]

    if (!isValidAccessCode(accessCode) || !isValidSlug(slug)) {
      return NextResponse.json({ error: "URL inválida" }, { status: 404 })
    }

    // Admin API routes — check auth
    if (segments[3] === "admin") {
      const isAdminLogin = segments.slice(3).join("/") === "admin/auth" ||
        segments.slice(3).join("/") === "admin/auth/check" ||
        segments.slice(3).join("/") === "admin/auth/logout"

      if (!isAdminLogin) {
        const cookieName = getAdminCookieName(accessCode)
        const cookie = request.cookies.get(cookieName)
        if (!cookie?.value || !isValidTokenFormat(cookie.value)) {
          return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
        }
      }
    }

    return NextResponse.next()
  }

  // ── Wedding page routes ─────────────────────────────────────────────────────
  if (segments.length >= 2 && segments[0] !== "api" && segments[0] !== "_next" && segments[0] !== "favicon.ico") {
    const accessCode = segments[0]
    const slug = segments[1]

    // Valida formato
    if (!isValidAccessCode(accessCode) || !isValidSlug(slug)) {
      return NextResponse.next() // Deixa o Next.js decidir (404 ou outra rota)
    }

    // Admin page routes — check auth
    if (segments[2] === "admin") {
      const isAdminLogin = segments.length === 3 // /{ac}/{slug}/admin (login page)

      if (!isAdminLogin) {
        const cookieName = getAdminCookieName(accessCode)
        const cookie = request.cookies.get(cookieName)
        if (!cookie?.value || !isValidTokenFormat(cookie.value)) {
          return NextResponse.redirect(new URL(`/${accessCode}/${slug}/admin`, request.url))
        }
      }
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/super-admin/:path*",
    "/api/super-admin/:path*",
    "/api/:accessCode/:slug/:path*",
    "/:accessCode/:slug/:path*",
  ],
}
