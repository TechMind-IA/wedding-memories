/**
 * Nome: lib/super-admin-auth.ts
 * Função: Autenticação do super-admin (acesso total ao sistema).
 */

import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { compare } from "bcryptjs"
import { timingSafeEqual } from "crypto"

const COOKIE_NAME = "super_admin_session"
const COOKIE_MAX_AGE = Number(process.env.SESSION_MAX_AGE_HOURS || 24) * 60 * 60

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definido")
  const url = process.env.DATABASE_URL.split("?")[0]
  return neon(url)
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function verifySuperAdminPassword(
  email: string,
  password: string
): Promise<boolean> {
  const sql = getDb()
  const rows = await sql`SELECT password_hash FROM super_admins WHERE email = ${email} LIMIT 1`
  if (rows.length === 0) return false
  return compare(password, rows[0].password_hash as string)
}

export async function createSuperAdminSession(): Promise<string> {
  const token = crypto.randomUUID()
  const sql = getDb()
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000)
  await sql`INSERT INTO super_admin_sessions (token, expires_at) VALUES (${token}, ${expiresAt})`
  return token
}

export async function verifySuperAdminSession(token: string): Promise<boolean> {
  const sql = getDb()
  const rows = await sql`SELECT token FROM super_admin_sessions WHERE expires_at > NOW()`
  return rows.some((row) => safeEqual(token, row.token as string))
}

export async function invalidateSuperAdminSession(token?: string): Promise<void> {
  const sql = getDb()
  if (token) {
    await sql`DELETE FROM super_admin_sessions WHERE token = ${token}`
  } else {
    await sql`DELETE FROM super_admin_sessions WHERE token IS NOT NULL`
  }
}

export async function setSuperAdminSession(
  response: NextResponse
): Promise<NextResponse> {
  const token = await createSuperAdminSession()
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  })
  return response
}

export async function isSuperAdminAuthenticated(
  request: NextRequest
): Promise<boolean> {
  const cookie = request.cookies.get(COOKIE_NAME)
  if (!cookie?.value) return false
  return verifySuperAdminSession(cookie.value)
}

export function clearSuperAdminSession(
  response: NextResponse
): NextResponse {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  })
  return response
}

/**
 * Middleware: retorna null se autenticado (cookie + DB), ou redirect se não.
 */
export async function requireSuperAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const cookie = request.cookies.get(COOKIE_NAME)
  if (!cookie?.value) {
    return NextResponse.redirect(new URL("/super-admin", request.url))
  }
  const valid = await verifySuperAdminSession(cookie.value)
  if (!valid) {
    return NextResponse.redirect(new URL("/super-admin", request.url))
  }
  return null
}
