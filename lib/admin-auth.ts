/**
 * Nome: lib/admin-auth.ts
 * Função: Autenticação do painel admin por casamento via cookie httpOnly.
 * Multi-tenant: cookie nomeado com access_code (admin_session_{accessCode}).
 */

import { NextRequest, NextResponse } from "next/server"
import { getConfig, setConfig } from "@/lib/db"

const COOKIE_MAX_AGE = Number(process.env.SESSION_MAX_AGE_HOURS || 24) * 60 * 60

function getCookieName(accessCode: string): string {
  return `admin_session_${accessCode}`
}

/**
 * Verifica se a senha fornecida corresponde à senha do admin daquele casamento.
 */
export async function verifyAdminPassword(
  weddingId: string,
  password: string
): Promise<boolean> {
  const storedPassword = await getConfig(weddingId, "admin_password")
  if (!storedPassword) return false
  return password === storedPassword
}

/**
 * Gera um novo token de sessão e salva no banco.
 */
export async function createSessionToken(
  weddingId: string
): Promise<string> {
  const token = crypto.randomUUID()
  await setConfig(weddingId, "session_token", token)
  return token
}

/**
 * Verifica se o token corresponde ao token armazenado no banco.
 */
export async function verifySessionToken(
  weddingId: string,
  token: string
): Promise<boolean> {
  const stored = await getConfig(weddingId, "session_token")
  if (!stored) return false
  return token === stored
}

/**
 * Invalida o token de sessão atual.
 */
export async function invalidateSession(weddingId: string): Promise<void> {
  await setConfig(weddingId, "session_token", "")
}

/**
 * Cria um cookie httpOnly de autenticação admin.
 */
export async function setAdminSession(
  response: NextResponse,
  accessCode: string,
  weddingId: string
): Promise<NextResponse> {
  const token = await createSessionToken(weddingId)
  const cookieName = getCookieName(accessCode)
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  })
  return response
}

/**
 * Verifica se o request tem um cookie de admin válido para aquele casamento.
 */
export async function isAdminAuthenticated(
  request: NextRequest,
  accessCode: string,
  weddingId: string
): Promise<boolean> {
  const cookieName = getCookieName(accessCode)
  const cookie = request.cookies.get(cookieName)
  if (!cookie?.value) return false
  return verifySessionToken(weddingId, cookie.value)
}

/**
 * Remove o cookie de admin (logout).
 */
export function clearAdminSession(
  response: NextResponse,
  accessCode: string
): NextResponse {
  const cookieName = getCookieName(accessCode)
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  })
  return response
}

/**
 * Middleware: retorna null se autenticado, ou redirect para login se não.
 */
export function requireAdmin(
  request: NextRequest,
  accessCode: string
): NextResponse | null {
  const cookieName = getCookieName(accessCode)
  const cookie = request.cookies.get(cookieName)
  if (cookie?.value && cookie.value.length > 0) return null

  const url = new URL(`/${accessCode}/admin`, request.url)
  return NextResponse.redirect(url)
}
