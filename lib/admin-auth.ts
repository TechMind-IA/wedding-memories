/**
 * Nome: lib/admin-auth.ts
 * Função: Autenticação do painel admin por casamento via cookie httpOnly.
 * Multi-tenant: cookie nomeado com access_code (admin_session_{accessCode}).
 */

import { NextRequest, NextResponse } from "next/server"
import { getConfig, setConfig } from "@/lib/db"
import { compare } from "bcryptjs"
import { timingSafeEqual } from "crypto"

const COOKIE_MAX_AGE = Number(process.env.SESSION_MAX_AGE_HOURS || 24) * 60 * 60

function getCookieName(accessCode: string): string {
  return `admin_session_${accessCode}`
}

/**
 * Comparação de strings com timing constante (proteção contra side-channel).
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * Verifica se a senha fornecida corresponde à senha do admin daquele casamento.
 * Auto-migra senhas em plaintext para bcrypt.
 */
export async function verifyAdminPassword(
  weddingId: string,
  password: string
): Promise<boolean> {
  const storedPassword = await getConfig(weddingId, "admin_password")
  if (!storedPassword) return false
  if (storedPassword.startsWith("$2")) {
    return compare(password, storedPassword)
  }
  if (password === storedPassword) {
    const { hash } = await import("bcryptjs")
    const hashed = await hash(password, 10)
    await setConfig(weddingId, "admin_password", hashed)
    return true
  }
  return false
}

/**
 * Verifica se a senha de moderação está correta.
 * Auto-migra senhas em plaintext para bcrypt.
 */
export async function verifyModerationPassword(
  weddingId: string,
  password: string
): Promise<boolean> {
  const storedPassword = await getConfig(weddingId, "moderation_password")
  if (!storedPassword) return false
  if (storedPassword.startsWith("$2")) {
    return compare(password, storedPassword)
  }
  if (password === storedPassword) {
    const { hash } = await import("bcryptjs")
    const hashed = await hash(password, 10)
    await setConfig(weddingId, "moderation_password", hashed)
    return true
  }
  return false
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
  return safeEqual(token, stored)
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
 * Verifica se o request tem uma sessão admin válida (cookie + DB).
 * Retorna null se autenticado, ou redirect/Response se não.
 */
export async function requireAdmin(
  request: NextRequest,
  accessCode: string,
  weddingId: string
): Promise<NextResponse | null> {
  const cookieName = getCookieName(accessCode)
  const cookie = request.cookies.get(cookieName)
  if (!cookie?.value) {
    return NextResponse.redirect(new URL(`/${accessCode}/admin`, request.url))
  }
  const valid = await verifySessionToken(weddingId, cookie.value)
  if (!valid) {
    return NextResponse.redirect(new URL(`/${accessCode}/admin`, request.url))
  }
  return null
}
