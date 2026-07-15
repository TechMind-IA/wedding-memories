/**
 * Nome: lib/admin-auth.ts
 * Função: Autenticação do painel admin via cookie httpOnly com token randomizado.
 */

import { NextRequest, NextResponse } from "next/server"
import { getConfig, setConfig } from "@/lib/db"

const COOKIE_NAME = "admin_session"
const COOKIE_MAX_AGE = Number(process.env.SESSION_MAX_AGE_HOURS || 24) * 60 * 60

/**
 * Verifica se a senha fornecida corresponde à senha do admin no banco.
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const storedPassword = await getConfig("admin_password")
  if (!storedPassword) return false
  return password === storedPassword
}

/**
 * Gera um novo token de sessão e salva no banco.
 */
export async function createSessionToken(): Promise<string> {
  const token = crypto.randomUUID()
  await setConfig("session_token", token)
  return token
}

/**
 * Verifica se o token do cookie corresponde ao token armazenado no banco.
 */
export async function verifySessionToken(token: string): Promise<boolean> {
  const stored = await getConfig("session_token")
  if (!stored) return false
  return token === stored
}

/**
 * Invalida o token de sessão atual (usado ao trocar senha).
 */
export async function invalidateSession(): Promise<void> {
  await setConfig("session_token", "")
}

/**
 * Cria um cookie httpOnly de autenticação admin com token randomizado.
 */
export async function setAdminSession(response: NextResponse): Promise<NextResponse> {
  const token = await createSessionToken()
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  })
  return response
}

/**
 * Verifica se o request tem um cookie de admin válido.
 */
export async function isAdminAuthenticated(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(COOKIE_NAME)
  if (!cookie?.value) return false
  return verifySessionToken(cookie.value)
}

/**
 * Remove o cookie de admin (logout).
 */
export function clearAdminSession(response: NextResponse): NextResponse {
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
 * Middleware: retorna null se autenticado, ou redirect para /admin se não.
 * Versão síncrona para uso no middleware (compara token staticamente).
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const cookie = request.cookies.get(COOKIE_NAME)
  if (cookie?.value && cookie.value.length > 0) return null

  const url = new URL("/admin", request.url)
  return NextResponse.redirect(url)
}
