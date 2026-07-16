/**
 * Nome: lib/super-admin-auth.ts
 * Função: Autenticação do super-admin (acesso total ao sistema).
 */

import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { compare } from "bcryptjs"

const COOKIE_NAME = "super_admin_session"
const COOKIE_MAX_AGE = Number(process.env.SESSION_MAX_AGE_HOURS || 24) * 60 * 60

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definido")
  const url = process.env.DATABASE_URL.split("?")[0]
  return neon(url)
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
  const rows = await sql`SELECT token FROM super_admin_sessions WHERE token = ${token} AND expires_at > NOW()`
  return rows.length > 0
}

export async function invalidateSuperAdminSession(): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM super_admin_sessions WHERE token IS NOT NULL`
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

export function requireSuperAdmin(
  request: NextRequest
): NextResponse | null {
  const cookie = request.cookies.get(COOKIE_NAME)
  if (cookie?.value && cookie.value.length > 0) return null
  const url = new URL("/super-admin", request.url)
  return NextResponse.redirect(url)
}
