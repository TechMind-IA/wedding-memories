/**
 * Nome: lib/wedding-context.ts
 * Função: Resolve o casamento a partir da URL (accessCode + slug).
 * Usado server-side para todas as rotas multi-tenant.
 */

import { neon } from "@neondatabase/serverless"
import { getConfig } from "./db"

export interface WeddingContext {
  id: string
  accessCode: string
  slug: string
  coupleNames: string
  weddingDate: string | null
  themeColor: string
  fontFamily: string
  backgroundType: string
  customTexts: Record<string, string>
  isActive: boolean
}

// Cache em memória para evitar queries a cada request (TTL 5 min)
const cache = new Map<string, { wedding: WeddingContext | null; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definido")
  const url = process.env.DATABASE_URL.split("?")[0]
  return neon(url)
}

function parseCustomTexts(raw: string | null): Record<string, string> {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

async function buildWeddingContext(row: Record<string, unknown>): Promise<WeddingContext> {
  const weddingId = row.id as string
  const [fontFamily, backgroundType, customTextsRaw] = await Promise.all([
    getConfig(weddingId, "font_family"),
    getConfig(weddingId, "background_type"),
    getConfig(weddingId, "custom_texts"),
  ])

  return {
    id: weddingId,
    accessCode: row.access_code as string,
    slug: row.slug as string,
    coupleNames: row.couple_names as string,
    weddingDate: row.wedding_date as string | null,
    themeColor: (row.theme_color as string) || "#C2754F",
    fontFamily: fontFamily || "montserrat",
    backgroundType: backgroundType || "floral",
    customTexts: parseCustomTexts(customTextsRaw),
    isActive: row.is_active as boolean,
  }
}

/**
 * Busca casamento pelo access_code. Resultado é cacheado por 5 minutos.
 */
export async function getWeddingByAccessCode(
  accessCode: string
): Promise<WeddingContext | null> {
  const cached = cache.get(accessCode)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.wedding
  }

  const sql = getDb()
  const rows = await sql`
    SELECT id, access_code, slug, couple_names, wedding_date, theme_color, is_active
    FROM weddings
    WHERE access_code = ${accessCode}
    LIMIT 1
  `

  if (!rows[0]) {
    cache.set(accessCode, { wedding: null, expiresAt: Date.now() + CACHE_TTL_MS })
    return null
  }

  const wedding = await buildWeddingContext(rows[0] as Record<string, unknown>)

  cache.set(accessCode, { wedding, expiresAt: Date.now() + CACHE_TTL_MS })
  return wedding
}

/**
 * Busca casamento pelo slug (para rotas que só têm o slug).
 */
export async function getWeddingBySlug(
  slug: string
): Promise<WeddingContext | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT id, access_code, slug, couple_names, wedding_date, theme_color, is_active
    FROM weddings
    WHERE slug = ${slug}
    LIMIT 1
  `

  if (!rows[0]) return null

  const wedding = await buildWeddingContext(rows[0] as Record<string, unknown>)

  // Cache pelo access_code também
  cache.set(wedding.accessCode, { wedding, expiresAt: Date.now() + CACHE_TTL_MS })
  return wedding
}

/**
 * Busca casamento pelo ID.
 */
export async function getWeddingById(
  id: string
): Promise<WeddingContext | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT id, access_code, slug, couple_names, wedding_date, theme_color, is_active
    FROM weddings
    WHERE id = ${id}
    LIMIT 1
  `

  if (!rows[0]) return null

  const wedding = await buildWeddingContext(rows[0] as Record<string, unknown>)

  cache.set(wedding.accessCode, { wedding, expiresAt: Date.now() + CACHE_TTL_MS })
  return wedding
}

/**
 * Extrai access_code e slug de um objeto Request (server-side).
 * Assume URL no formato: /{accessCode}/{slug}/...
 */
export function extractWeddingParams(
  request: Request
): { accessCode: string; slug: string } | null {
  const url = new URL(request.url)
  const segments = url.pathname.split("/").filter(Boolean)

  // Precisa ter pelo menos accessCode e slug
  if (segments.length < 2) return null

  const accessCode = segments[0]
  const slug = segments[1]

  // Valida formato do access_code (hex de 12 chars)
  if (!/^[0-9a-f]{12}$/.test(accessCode)) return null
  // Valida slug (letras, números, hífens)
  if (!/^[a-z0-9-]+$/.test(slug)) return null

  return { accessCode, slug }
}

/**
 * Resolve wedding completa a partir de um Request.
 * Retorna null se accessCode inválido ou wedding não encontrado.
 */
export async function resolveWeddingFromRequest(
  request: Request
): Promise<WeddingContext | null> {
  const params = extractWeddingParams(request)
  if (!params) return null

  const wedding = await getWeddingByAccessCode(params.accessCode)
  if (!wedding) return null

  // Valida que o slug bate
  if (wedding.slug !== params.slug) return null

  return wedding
}

/**
 * Limpa o cache (útil para testes ou após updates).
 */
export function clearWeddingCache(accessCode?: string) {
  if (accessCode) {
    cache.delete(accessCode)
  } else {
    cache.clear()
  }
}
